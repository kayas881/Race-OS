import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { CreditCard, RefreshCw, Trash2, AlertTriangle, Upload, Bell, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { apiFetch, getApiUrl, getAuthToken } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Bank auto-connect (Plaid) needs Plaid production access, which isn't live yet - CSV
// import is the primary path until then. Flip this once it is, rather than deleting the
// working sandbox-verified Plaid Link integration below.
const PLAID_LIVE = false;

const Accounts = () => {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  // Set while a reconnect (Plaid Link "update mode") is in flight, so onSuccess knows
  // to re-sync the existing bank instead of exchanging a new public token.
  const [reconnectingBankId, setReconnectingBankId] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvFormats, setCsvFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('generic');
  const [waitlisted, setWaitlisted] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  useEffect(() => {
    fetchBanks();
    fetchCsvFormats();
  }, []);

  const fetchCsvFormats = async () => {
    try {
      const res = await apiFetch('api/integrations/csv/formats');
      if (res.ok) {
        setCsvFormats(await res.json());
      }
    } catch (error) {
      console.error('Error fetching CSV formats:', error);
    }
  };

  useEffect(() => {
    setWaitlisted(!!user?.bankConnectWaitlist?.requested);
  }, [user]);

  const fetchBanks = async () => {
    try {
      const res = await apiFetch('api/integrations/banks');
      if (res.ok) {
        setBanks(await res.json());
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setUploadingCsv(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      // Sending the format id directly (e.g. "chase", "generic") is what
      // detectFormat's exact-match lookup expects - it must match a real key in
      // csvImportService's supportedFormats, not a free-text bank name.
      formData.append('bankName', selectedFormat);
      formData.append('accountType', 'checking');

      // multipart upload can't go through apiFetch (it always sets Content-Type: application/json)
      const token = await getAuthToken();
      const res = await fetch(getApiUrl('api/integrations/csv/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Imported ${data.imported} transaction${data.imported === 1 ? '' : 's'}`);
        setCsvFile(null);
        fetchBanks();
      } else {
        toast.error(data.error || 'CSV import failed');
      }
    } catch (error) {
      toast.error('CSV import failed');
    } finally {
      setUploadingCsv(false);
    }
  };

  const joinWaitlist = async () => {
    setJoiningWaitlist(true);
    try {
      const res = await apiFetch('api/integrations/plaid/waitlist', { method: 'POST' });
      if (res.ok) {
        setWaitlisted(true);
        toast.success("You're on the list - we'll email you when bank auto-connect is live.");
      } else {
        toast.error('Failed to join waitlist');
      }
    } catch (error) {
      toast.error('Failed to join waitlist');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const startConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch('api/integrations/plaid/link-token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLinkToken(data.linkToken);
        // OAuth institutions take the user to the bank's own login page and back -
        // that's a full page navigation, so React state doesn't survive it. Persist
        // the token so /integrations/plaid/callback can resume Link with it.
        localStorage.setItem('plaid_link_token', data.linkToken);
        localStorage.removeItem('plaid_reconnect_bank_id');
      } else {
        toast.error('Failed to start bank connection');
        setConnecting(false);
      }
    } catch (error) {
      toast.error('Failed to start bank connection');
      setConnecting(false);
    }
  };

  const onSuccess = useCallback(async (publicToken) => {
    try {
      if (reconnectingBankId) {
        // Update mode re-uses the existing access_token - there's no new public_token
        // to exchange, so just re-sync to confirm the item is healthy again (that also
        // clears the error status set by a prior failed-login webhook).
        const res = await apiFetch(`api/integrations/banks/${reconnectingBankId}/sync`, { method: 'POST' });
        if (res.ok) {
          toast.success('Bank reconnected!');
          fetchBanks();
        } else {
          toast.error('Reconnected, but syncing failed - try Sync again');
        }
        return;
      }

      const res = await apiFetch('api/integrations/plaid/exchange-token', {
        method: 'POST',
        body: JSON.stringify({ publicToken })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Bank account connected!');
        fetchBanks();
      } else {
        toast.error(data.error || 'Failed to connect bank account');
      }
    } catch (error) {
      toast.error('Failed to connect bank account');
    } finally {
      setLinkToken(null);
      setConnecting(false);
      setReconnectingBankId(null);
      localStorage.removeItem('plaid_link_token');
      localStorage.removeItem('plaid_reconnect_bank_id');
    }
  }, [reconnectingBankId]);

  const onExit = useCallback(() => {
    setLinkToken(null);
    setConnecting(false);
    setReconnectingBankId(null);
    localStorage.removeItem('plaid_link_token');
    localStorage.removeItem('plaid_reconnect_bank_id');
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
    onEvent: (eventName, metadata) => {
      console.log('🏦 Plaid Link event:', eventName, metadata);
    }
  });

  // Plaid Link opens itself once a token is set and the widget is ready to launch.
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const syncBank = async (id) => {
    setSyncingId(id);
    try {
      const res = await apiFetch(`api/integrations/banks/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const { created, updated } = data.transactionsSynced || {};
        toast.success(`Synced: ${created || 0} new, ${updated || 0} updated transaction(s)`);
        fetchBanks();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const startReconnect = async (id) => {
    setConnecting(true);
    setReconnectingBankId(id);
    try {
      const res = await apiFetch('api/integrations/plaid/link-token/update', {
        method: 'POST',
        body: JSON.stringify({ bankIntegrationId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setLinkToken(data.linkToken);
        localStorage.setItem('plaid_link_token', data.linkToken);
        localStorage.setItem('plaid_reconnect_bank_id', id);
      } else {
        toast.error('Failed to start reconnect');
        setConnecting(false);
        setReconnectingBankId(null);
      }
    } catch (error) {
      toast.error('Failed to start reconnect');
      setConnecting(false);
      setReconnectingBankId(null);
    }
  };

  const disconnectBank = async (id) => {
    try {
      const res = await apiFetch(`api/integrations/banks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Bank account disconnected');
        fetchBanks();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your bank accounts and credit cards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary: CSV import - works today, no external approval needed */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Import Bank Statement</p>
              <p className="text-sm text-gray-500">Upload a CSV export from your bank</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bank format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {csvFormats.map((format) => (
                  <option key={format.id} value={format.id}>{format.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Not listed? Choose "Generic CSV Format" and make sure your file has date, description, amount, balance, and reference columns.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <button
                onClick={handleCsvUpload}
                disabled={!csvFile || uploadingCsv}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {uploadingCsv ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary: Plaid bank auto-connect, gated behind production access */}
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-500">
                Connect Bank <span className="text-xs font-normal text-gray-400">(Coming Soon)</span>
              </p>
              <p className="text-sm text-gray-400">Automatic sync - no manual uploads needed</p>
            </div>
          </div>
          {waitlisted ? (
            <div className="inline-flex items-center text-sm text-green-700">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              You're on the list
            </div>
          ) : (
            <button
              onClick={joinWaitlist}
              disabled={joiningWaitlist}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell className="h-4 w-4 mr-2" />
              {joiningWaitlist ? 'Joining...' : 'Notify Me'}
            </button>
          )}
        </div>
      </div>

      {PLAID_LIVE && (
        <div className="flex justify-end">
          <button
            onClick={startConnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            {connecting ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white shadow rounded-lg px-6 py-12 text-center text-sm text-gray-500">
          Loading accounts...
        </div>
      ) : banks.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No accounts connected</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Import a CSV bank statement above to automatically categorize your transactions.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {banks.map((bank) => (
            <div key={bank._id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bank.status === 'error' ? 'bg-red-50' : 'bg-primary-50'}`}>
                  <CreditCard className={`h-5 w-5 ${bank.status === 'error' ? 'text-red-600' : 'text-primary-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{bank.institutionName || 'Connected Bank'}</p>
                  <p className="text-sm text-gray-500">
                    {(bank.accounts || []).length} account{(bank.accounts || []).length === 1 ? '' : 's'} • Last sync:{' '}
                    {bank.lastSyncAt ? new Date(bank.lastSyncAt).toLocaleDateString() : 'Never'}
                  </p>
                  {bank.status === 'error' && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                      {bank.errorMessage || 'This connection needs to be reconnected.'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {bank.status === 'error' ? (
                  <button
                    onClick={() => startReconnect(bank._id)}
                    disabled={connecting}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                  >
                    Reconnect
                  </button>
                ) : (
                  <button
                    onClick={() => syncBank(bank._id)}
                    disabled={syncingId === bank._id}
                    className="p-2 text-gray-500 hover:text-primary-600 rounded-md hover:bg-gray-50"
                    title="Sync transactions"
                  >
                    <RefreshCw className={`h-5 w-5 ${syncingId === bank._id ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => disconnectBank(bank._id)}
                  className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-50"
                  title="Disconnect"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;
