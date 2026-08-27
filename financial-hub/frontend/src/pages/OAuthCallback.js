import React, { useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const { platform } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isPlaid = platform === 'plaid';

  // Plaid's OAuth institutions take the user to the bank's own login page via a full
  // top-level redirect, then back to this route with an oauth_state_id query param -
  // that's a totally different mechanism from the popup+authorization-code pattern the
  // other platforms below use. React state doesn't survive the redirect, so the token
  // Accounts.js started Link with was persisted to localStorage for this moment.
  const storedLinkToken = isPlaid ? localStorage.getItem('plaid_link_token') : null;
  const reconnectBankId = isPlaid ? localStorage.getItem('plaid_reconnect_bank_id') : null;

  const clearPlaidStorage = () => {
    localStorage.removeItem('plaid_link_token');
    localStorage.removeItem('plaid_reconnect_bank_id');
  };

  const onPlaidSuccess = useCallback(async (publicToken) => {
    try {
      if (reconnectBankId) {
        // Update mode re-uses the existing access_token - just re-sync to confirm
        // the item is healthy again (also clears any prior error status).
        const res = await apiFetch(`api/integrations/banks/${reconnectBankId}/sync`, { method: 'POST' });
        if (res.ok) toast.success('Bank reconnected!');
        else toast.error('Reconnected, but syncing failed - try Sync again');
      } else {
        const res = await apiFetch('api/integrations/plaid/exchange-token', {
          method: 'POST',
          body: JSON.stringify({ publicToken })
        });
        const data = await res.json();
        if (res.ok) toast.success('Bank account connected!');
        else toast.error(data.error || 'Failed to connect bank account');
      }
    } catch (error) {
      toast.error('Failed to complete bank connection');
    } finally {
      clearPlaidStorage();
      navigate('/accounts');
    }
  }, [reconnectBankId, navigate]);

  const onPlaidExit = useCallback((err) => {
    if (err) toast.error('Bank connection was not completed');
    clearPlaidStorage();
    navigate('/accounts');
  }, [navigate]);

  const { open, ready } = usePlaidLink({
    token: storedLinkToken,
    receivedRedirectUri: isPlaid ? window.location.href : undefined,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit
  });

  // Resume the same Link session Accounts.js started - receivedRedirectUri carries
  // Plaid's oauth_state_id so Link continues where the user left off instead of
  // starting over.
  useEffect(() => {
    if (!isPlaid) return;

    if (storedLinkToken && ready) {
      open();
    } else if (!storedLinkToken) {
      // Directly navigating/refreshing this URL with nothing to resume.
      toast.error('Bank connection session expired - please try connecting again');
      navigate('/accounts');
    }
  }, [isPlaid, storedLinkToken, ready, open, navigate]);

  useEffect(() => {
    if (isPlaid) return; // handled above

    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback for:', platform);

        // Extract authorization code from URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          console.error('❌ OAuth error:', error);
          window.opener?.postMessage({
            type: 'OAUTH_COMPLETE',
            success: false,
            error: error
          }, window.location.origin);
          window.close();
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received');
          window.opener?.postMessage({
            type: 'OAUTH_COMPLETE',
            success: false,
            error: 'No authorization code received'
          }, window.location.origin);
          window.close();
          return;
        }

        console.log('✅ Authorization code received, exchanging for tokens...');

        // Send the authorization code to the backend
        const response = await apiFetch(`api/integrations/platforms/${platform}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok) {
          console.log('✅ OAuth integration completed successfully');
          window.opener?.postMessage({
            type: 'OAUTH_COMPLETE',
            success: true,
            platform: platform
          }, window.location.origin);
        } else {
          console.error('❌ OAuth callback failed:', result.error);
          window.opener?.postMessage({
            type: 'OAUTH_COMPLETE',
            success: false,
            error: result.error
          }, window.location.origin);
        }

        window.close();
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        window.opener?.postMessage({
          type: 'OAUTH_COMPLETE',
          success: false,
          error: error.message
        }, window.location.origin);
        window.close();
      }
    };

    handleCallback();
  }, [platform, location, isPlaid]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">
          Completing {platform?.charAt(0).toUpperCase() + platform?.slice(1)} Integration...
        </h2>
        <p className="text-gray-500 mt-2">
          Please wait while we finalize your connection.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
