import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const ClientDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalClients: 0,
      activeClients: 0,
      totalOutstanding: 0,
      totalBilled: 0,
      totalPaid: 0
    },
    clientsWithDebt: [],
    recentClients: [],
    overdueInvoices: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getUrgencyColor = (amount) => {
    if (amount >= 5000) return 'bg-red-100 text-red-800 border-red-200';
    if (amount >= 1000) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { summary, clientsWithDebt, recentClients, overdueInvoices } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          Client Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Track outstanding payments and client relationships
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalClients}</p>
              <p className="text-xs text-green-600">
                {summary.activeClients} active
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
              <p className="text-xs text-gray-500">
                Pending payments
              </p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalBilled)}</p>
              <p className="text-xs text-gray-500">
                All time revenue
              </p>
            </div>
            <DocumentTextIcon className="h-12 w-12 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Collection Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.totalBilled > 0 
                  ? Math.round((summary.totalPaid / summary.totalBilled) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(summary.totalPaid)} collected
              </p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Clients Who Owe Money */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6 text-red-500" />
              Outstanding Payments
              {clientsWithDebt.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {clientsWithDebt.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Clients with pending payments
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {clientsWithDebt.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {clientsWithDebt.map((client, index) => (
                  <motion.div
                    key={client._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {client.name}
                        </h3>
                        {client.company && (
                          <p className="text-sm text-gray-500">{client.company}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {client.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg px-3 py-1 rounded-lg border ${getUrgencyColor(client.outstandingBalance)}`}>
                          {formatCurrency(client.outstandingBalance)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Status: {client.getPaymentStatus?.() || 'Outstanding'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No outstanding payments at the moment.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Overdue Invoices */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationCircleIcon className="h-6 w-6 text-orange-500" />
              Overdue Invoices
              {overdueInvoices.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {overdueInvoices.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Invoices past due date
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {overdueInvoices.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {overdueInvoices.map((invoice, index) => (
                  <motion.div
                    key={`${invoice._id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {invoice.clientName}
                        </h3>
                        {invoice.company && (
                          <p className="text-sm text-gray-500">{invoice.company}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <ClockIcon className="h-4 w-4 text-orange-500" />
                          <p className="text-xs text-orange-600">
                            {getDaysOverdue(invoice.oldestDueDate)} days overdue
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-orange-600">
                          {formatCurrency(invoice.totalOverdue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.invoiceCount} invoice{invoice.invoiceCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          Since {formatDate(invoice.oldestDueDate)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No overdue invoices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All invoices are current or paid.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Clients */}
      {recentClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserGroupIcon className="h-6 w-6 text-blue-500" />
              Recent Clients
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Recently added clients
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentClients.map((client, index) => (
                <motion.div
                  key={client._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900">{client.name}</h3>
                  {client.company && (
                    <p className="text-sm text-gray-500">{client.company}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Added {formatDate(client.createdAt)}
                  </p>
                  {client.outstandingBalance > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Outstanding: {formatCurrency(client.outstandingBalance)}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ClientDashboard;
