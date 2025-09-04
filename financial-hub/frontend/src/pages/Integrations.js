import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BanknotesIcon, 
  LinkIcon, 
  ArrowUpTrayIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { usePlaidLink } from 'react-plaid-link';
import { apiFetch } from '../utils/api';

const Integrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [integrationsRes, banksRes, platformsRes] = await Promise.all([
        apiFetch('api/integrations'),
        apiFetch('api/integrations/banks'),
        apiFetch('api/integrations/platforms')
      ]);

      const integrations = await integrationsRes.json();
      const banks = await banksRes.json();
      const platforms = await platformsRes.json();

      // Ensure we always have arrays, even if the API returns an error
      setIntegrations(Array.isArray(integrations) ? integrations : []);
      setConnectedBanks(Array.isArray(banks) ? banks : []);
      setConnectedPlatforms(Array.isArray(platforms) ? platforms : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set default empty arrays in case of error
      setIntegrations([]);
      setConnectedBanks([]);
      setConnectedPlatforms([]);
    } finally {
      setLoading(false);
    }
  };

  const connectPlaid = async () => {
    try {
      const response = await fetch('/api/integrations/plaid/link-token', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const { linkToken } = await response.json();
      
      if (linkToken && linkToken !== 'demo-link-token') {
        // Real Plaid Link integration
        alert(`Real Plaid Link would open here with token: ${linkToken}`);
        // In production, you'd use Plaid Link SDK here
        // window.Plaid.create({
        //   token: linkToken,
        //   onSuccess: (publicToken, metadata) => {
        //     // Exchange public token
        //   }
        // }).open();
      } else {
        alert(`Demo: Plaid Link would open here with token: ${linkToken}`);
      }
      
      // Simulate successful connection for demo
      setTimeout(async () => {
        const exchangeResponse = await fetch('/api/integrations/plaid/exchange-token', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            publicToken: 'demo-public-token',
            institutionId: 'demo-institution'
          })
        });
        
        const result = await exchangeResponse.json();
        alert(`Success: ${result.message}`);
        fetchData(); // Refresh data
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting to Plaid:', error);
    }
  };

  const connectPlatform = async (platform) => {
    try {
      const response = await apiFetch(`api/integrations/platforms/${platform}/connect`, {
        method: 'POST'
      });
      
      const { authUrl } = await response.json();
      
      if (authUrl && !authUrl.includes('demo')) {
        // Real OAuth flow - open in new window
        const popup = window.open(authUrl, 'oauth', 'width=500,height=600');
        
        // Listen for OAuth completion via postMessage
        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'OAUTH_COMPLETE') {
            popup.close();
            window.removeEventListener('message', handleMessage);
            
            if (event.data.success) {
              console.log('✅ OAuth completed successfully');
              fetchData(); // Refresh data
            } else {
              console.error('❌ OAuth failed:', event.data.error);
            }
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Timeout fallback in case message doesn't arrive
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          console.log('⏰ OAuth timeout - please check if the integration completed');
          fetchData(); // Refresh data anyway
        }, 30000); // 30 second timeout
      } else {
        // Demo mode
        alert(`Demo: ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth would open: ${authUrl}`);
        
        // Simulate successful callback for demo
        setTimeout(async () => {
          const callbackResponse = await fetch(`/api/integrations/platforms/${platform}/callback`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: 'demo-auth-code' })
          });
          
          const result = await callbackResponse.json();
          alert(`Success: ${result.message}`);
          fetchData(); // Refresh data
        }, 1500);
      }
      
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
    }
  };

  const syncIntegration = async (id, type) => {
    setSyncingId(id);
    try {
      const response = await apiFetch(`api/integrations/${type}/${id}/sync`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      alert(`Sync completed: ${result.message}`);
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error syncing:', error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const disconnectIntegration = async (id, type) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) return;
    
    try {
      const response = await apiFetch(`api/integrations/${type}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      alert('Integration disconnected successfully');
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert(`Disconnect failed: ${error.message}`);
    }
  };

  const handleCSVUpload = async () => {
    if (!selectedFile) return;
    
    setUploadingCSV(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', selectedFile);
      formData.append('bankName', 'Custom Bank');
      formData.append('accountType', 'checking');
      
      const response = await fetch('/api/integrations/csv/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const result = await response.json();
      alert(`CSV imported: ${result.imported} transactions processed`);
      setSelectedFile(null);
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error uploading CSV:', error);
    } finally {
      setUploadingCSV(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CogIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-2 text-gray-600">
          Connect your financial accounts and revenue platforms
        </p>
      </div>

      {/* Available Integrations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(integrations || []).map((integration) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full mt-2">
                    {integration.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                {integration.id === 'plaid' ? (
                  <button
                    onClick={connectPlaid}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Bank
                  </button>
                ) : (
                  <button
                    onClick={() => connectPlatform(integration.id)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect {integration.name}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CSV Upload */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Import</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Bank Statement (CSV)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload a CSV file from your bank for manual transaction import
          </p>
          
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handleCSVUpload}
              disabled={!selectedFile || uploadingCSV}
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              {uploadingCSV ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              )}
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Connected Banks */}
      {(connectedBanks || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Banks</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {(connectedBanks || []).map((bank) => (
                <div key={bank._id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {bank.institutionName || 'Connected Bank'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {(bank.accountIds || []).length} account(s) • Last sync: {' '}
                        {bank.lastSyncAt ? new Date(bank.lastSyncAt).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(bank.status)}
                    <button
                      onClick={() => syncIntegration(bank._id, 'banks')}
                      disabled={syncingId === bank._id}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${syncingId === bank._id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => disconnectIntegration(bank._id, 'banks')}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connected Platforms */}
      {(connectedPlatforms || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Platforms</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {(connectedPlatforms || []).map((platform) => (
                <div key={platform._id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">
                        {platform.platform.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 capitalize">
                        {platform.platform}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {platform.channelName || platform.platformUsername} • Last sync: {' '}
                        {platform.lastSyncAt ? new Date(platform.lastSyncAt).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(platform.status)}
                    <button
                      onClick={() => syncIntegration(platform._id, 'platforms')}
                      disabled={syncingId === platform._id}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${syncingId === platform._id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => disconnectIntegration(platform._id, 'platforms')}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(connectedBanks || []).length === 0 && (connectedPlatforms || []).length === 0 && (
        <div className="text-center py-12">
          <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations connected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by connecting your first financial account or platform
          </p>
        </div>
      )}
    </div>
  );
};

export default Integrations;
