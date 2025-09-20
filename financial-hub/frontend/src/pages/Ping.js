import React, { useState, useEffect } from 'react';
import { Client, Locale } from 'appwrite';

const endpoint = process.env.REACT_APP_APPWRITE_ENDPOINT;
const projectId = process.env.REACT_APP_APPWRITE_PROJECT_ID;
const projectName = process.env.REACT_APP_APPWRITE_PROJECT_NAME || 'Race-OS';

export default function Ping() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sdkResult, setSdkResult] = useState(null);
  const [sdkError, setSdkError] = useState(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Auto-trigger SDK ping on mount to help Appwrite Console detect connection
  useEffect(() => {
    if (endpoint && projectId && !autoTriggered) {
      setAutoTriggered(true);
      console.log('🚀 Auto-triggering SDK ping to help Appwrite Console detect connection...');
      sendSdkPing();
    }
  }, [endpoint, projectId, autoTriggered]);

  const sendPing = async () => {
    if (!endpoint) {
      setError('REACT_APP_APPWRITE_ENDPOINT is not set');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/health`);
      const data = await res.json();
      setResult({ ok: res.ok, ...data });
    } catch (e) {
      setError(e.message || 'Ping failed');
    } finally {
      setLoading(false);
    }
  };

  const sendSdkPing = async () => {
    if (!endpoint || !projectId) {
      setSdkError('REACT_APP_APPWRITE_ENDPOINT or REACT_APP_APPWRITE_PROJECT_ID not set');
      return;
    }
    setLoading(true);
    setSdkError(null);
    setSdkResult(null);
    try {
      console.log('📡 Sending SDK ping to Appwrite...', { endpoint, projectId });
      const client = new Client().setEndpoint(endpoint).setProject(projectId);
      const locale = new Locale(client);
      const data = await locale.get(); // Public endpoint, no auth needed
      console.log('✅ SDK ping successful:', data);
      setSdkResult(data);
    } catch (e) {
      console.error('❌ SDK ping failed:', e);
      setSdkError(e.message || 'SDK ping failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">Appwrite Ping</h1>
        <p className="text-sm text-gray-600 mb-4">
          Project: <span className="font-mono">{projectName}</span> (ID: <span className="font-mono">{projectId}</span>)
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Endpoint: <span className="font-mono break-all">{endpoint || 'not set'}</span>
        </p>

        <button
          onClick={sendPing}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Pinging…' : 'Send a ping'}
        </button>

        <button
          onClick={sendSdkPing}
          disabled={loading}
          className="ml-3 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Pinging SDK…' : 'Send SDK ping'}
        </button>

        {result && (
          <div className="mt-6 p-4 rounded border border-green-200 bg-green-50">
            <div className="font-semibold text-green-700">Ping successful</div>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded border border-red-200 bg-red-50">
            <div className="font-semibold text-red-700">Ping failed</div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {sdkResult && (
          <div className="mt-6 p-4 rounded border border-emerald-200 bg-emerald-50">
            <div className="font-semibold text-emerald-700">SDK ping successful</div>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(sdkResult, null, 2)}</pre>
          </div>
        )}

        {sdkError && (
          <div className="mt-6 p-4 rounded border border-red-200 bg-red-50">
            <div className="font-semibold text-red-700">SDK ping failed</div>
            <p className="mt-2 text-sm text-red-700">{sdkError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
