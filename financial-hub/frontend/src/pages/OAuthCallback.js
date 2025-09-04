import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const OAuthCallback = () => {
  const { platform } = useParams();
  const location = useLocation();

  useEffect(() => {
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
  }, [platform, location]);

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
