import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const TaxNotificationSystem = forwardRef(({ userId }, ref) => {
  const [notifications, setNotifications] = useState([]);
  const [quarterlyDates, setQuarterlyDates] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    federalIncome: 0.22,
    stateIncome: 0.05,
    selfEmployment: 0.1413,
    totalRecommended: 0.30
  });

  useEffect(() => {
    fetchQuarterlyDates();
    fetchTaxSettings();
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showIncomeSetAsideNotification
  }));

  const fetchQuarterlyDates = async () => {
    try {
      const response = await fetch('/api/tax/quarterly-dates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuarterlyDates(data.upcomingDates);
        setNotifications(prev => [...prev, ...data.reminders]);
      }
    } catch (error) {
      console.error('Error fetching quarterly dates:', error);
    }
  };

  const fetchTaxSettings = async () => {
    try {
      const response = await fetch('/api/tax/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxSettings(data);
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error);
    }
  };

  const updateTaxSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/tax/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxSettings(data.settings);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Error updating tax settings:', error);
    }
  };

  const dismissNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Function to be called when new income is received
  const showIncomeSetAsideNotification = async (amount) => {
    try {
      const response = await fetch('/api/tax/calculate-set-aside', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const notification = {
          id: Date.now(),
          type: 'info',
          title: 'New Income Received',
          message: data.notification.message,
          breakdown: data.notification.breakdown,
          netIncome: data.notification.netIncome,
          amount: amount,
          timestamp: new Date(),
          autoHide: false
        };

        setNotifications(prev => [notification, ...prev]);
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
          dismissNotification(0);
        }, 30000);
      }
    } catch (error) {
      console.error('Error calculating set-aside:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-3">
      {/* Settings Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
          title="Tax Settings"
        >
          <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id || index}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`p-4 rounded-lg border shadow-lg ${getNotificationStyle(notification.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  {notification.title && (
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                  )}
                  <p className="text-sm">{notification.message}</p>
                  
                  {notification.breakdown && (
                    <div className="mt-2 text-xs space-y-1">
                      {notification.breakdown.map((item, i) => (
                        <div key={i} className="text-gray-600">{item}</div>
                      ))}
                      {notification.netIncome && (
                        <div className="font-medium text-green-700 mt-1">
                          {notification.netIncome}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {notification.action && (
                    <p className="text-xs mt-2 font-medium">{notification.action}</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => dismissNotification(index)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Quarterly Dates Widget */}
      {quarterlyDates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-sm text-gray-900">Upcoming Tax Dates</h3>
          </div>
          
          <div className="space-y-2">
            {quarterlyDates.slice(0, 2).map((date, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className={`${date.isPastDue ? 'text-red-600' : date.isUrgent ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {date.quarter} {date.isPastDue ? '(Past Due)' : ''}
                </span>
                <span className="text-gray-500">
                  {date.isPastDue ? `${Math.abs(date.daysUntil)} days ago` : `${date.daysUntil} days`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tax Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tax Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Federal Income Tax Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={taxSettings.federalIncome}
                    onChange={(e) => setTaxSettings(prev => ({
                      ...prev,
                      federalIncome: parseFloat(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(taxSettings.federalIncome * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State Income Tax Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={taxSettings.stateIncome}
                    onChange={(e) => setTaxSettings(prev => ({
                      ...prev,
                      stateIncome: parseFloat(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(taxSettings.stateIncome * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self-Employment Tax Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={taxSettings.selfEmployment}
                    onChange={(e) => setTaxSettings(prev => ({
                      ...prev,
                      selfEmployment: parseFloat(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(taxSettings.selfEmployment * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Recommended Set-Aside
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={taxSettings.totalRecommended}
                    onChange={(e) => setTaxSettings(prev => ({
                      ...prev,
                      totalRecommended: parseFloat(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(taxSettings.totalRecommended * 100).toFixed(1)}% of gross income
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateTaxSettings(taxSettings)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Export function to trigger income notification
export const triggerIncomeSetAsideNotification = async (amount) => {
  // This would be called from transaction creation
  if (window.taxNotificationSystem) {
    await window.taxNotificationSystem.showIncomeSetAsideNotification(amount);
  }
};

export default TaxNotificationSystem;
