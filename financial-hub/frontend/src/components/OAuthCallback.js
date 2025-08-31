import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const OAuthCallback = ({ platform }) => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting your account...');
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        setMessage(`Processing ${platform} authorization...`);

        // Send the code to your backend
        const response = await fetch(`/api/integrations/platforms/${platform}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ code, state })
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`);
          
          // Redirect to integrations page after a short delay
          setTimeout(() => {
            navigate('/integrations');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to connect account');
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An error occurred while connecting your account');
      }
    };

    handleCallback();
  }, [location, navigate, platform, user]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <LoadingSpinner size="lg" />;
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {platform.charAt(0).toUpperCase() + platform.slice(1)} Integration
        </h1>
        
        <p className={`text-lg ${getStatusColor()} mb-6`}>
          {message}
        </p>

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => navigate('/integrations')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Integrations
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'success' && (
          <p className="text-sm text-gray-500">
            Redirecting to integrations page...
          </p>
        )}
      </div>
    </div>
  );
};

// Specific callback components for each platform
export const YouTubeCallback = () => <OAuthCallback platform="youtube" />;
export const TwitchCallback = () => <OAuthCallback platform="twitch" />;
export const PatreonCallback = () => <OAuthCallback platform="patreon" />;

export default OAuthCallback;
