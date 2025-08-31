import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BellIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const NotificationWidget = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.slice(0, 5)); // Show last 5 notifications
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      const response = await fetch('/api/notifications/test/weekly-summary', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Test email sent! ${data.testUrl ? `Preview: ${data.testUrl}` : ''}`);
        fetchNotifications(); // Refresh notifications
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'invoice-reminder':
        return <EnvelopeIcon className="h-5 w-5 text-blue-600" />;
      case 'overdue-invoice':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'weekly-summary':
        return <ClockIcon className="h-5 w-5 text-green-600" />;
      case 'payment-confirmation':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'invoice-reminder':
        return 'bg-blue-50 border-blue-200';
      case 'overdue-invoice':
        return 'bg-red-50 border-red-200';
      case 'weekly-summary':
        return 'bg-green-50 border-green-200';
      case 'payment-confirmation':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatNotificationType = (type) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BellIcon className="h-6 w-6 text-blue-600" />
          Recent Notifications
        </h3>
        <button
          onClick={sendTestEmail}
          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
        >
          <EyeIcon className="h-4 w-4" />
          Test Email
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent notifications</p>
            <p className="text-gray-400 text-xs mt-1">
              Email notifications will appear here once configured
            </p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNotificationType(notification.type)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.subject}
                  </p>
                  {notification.recipient && (
                    <p className="text-xs text-gray-500 mt-1">
                      To: {notification.recipient}
                    </p>
                  )}
                  {notification.status === 'failed' && (
                    <p className="text-xs text-red-600 mt-1">
                      Failed to send
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing last {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationWidget;
