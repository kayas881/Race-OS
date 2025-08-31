import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Tax from './pages/Tax';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Integrations from './pages/Integrations';
import BrandingSettings from './pages/BrandingSettings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Register from './pages/Register';
import LoadingSpinner from './components/LoadingSpinner';
import TaxNotificationSystem from './components/TaxNotificationSystem';
import { YouTubeCallback, TwitchCallback, PatreonCallback } from './components/OAuthCallback';

function App() {
  const { user, loading, isAuthenticated } = useAuth();
  const taxNotificationRef = useRef();

  // Make tax notification system globally available
  useEffect(() => {
    if (isAuthenticated && taxNotificationRef.current) {
      window.taxNotificationSystem = taxNotificationRef.current;
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/integrations/youtube/callback" element={<YouTubeCallback />} />
                    <Route path="/integrations/twitch/callback" element={<TwitchCallback />} />
                    <Route path="/integrations/patreon/callback" element={<PatreonCallback />} />
                    <Route path="/branding" element={<BrandingSettings />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/tax" element={<Tax />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
                <TaxNotificationSystem ref={taxNotificationRef} userId={user?.id} />
              </>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
