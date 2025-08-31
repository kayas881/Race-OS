import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  PiggyBank,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  Clock,
  CheckCircle,
  Users
} from 'lucide-react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import TaxJarWidget from '../components/TaxJarWidget';
import IncomeChart from '../components/IncomeChart';
import RecentTransactions from '../components/RecentTransactions';
import QuickStats from '../components/QuickStats';
import NotificationWidget from '../components/NotificationWidget';

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    () => axios.get('/api/dashboard').then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: invoiceData, isLoading: invoicesLoading, error: invoicesError } = useQuery(
    'invoices',
    () => axios.get('/api/invoices').then(res => res.data),
    {
      refetchInterval: 30000,
    }
  );

  // Debug logging
  console.log('Invoice data:', invoiceData);
  console.log('Invoice loading:', invoicesLoading);
  console.log('Invoice error:', invoicesError);

  if (isLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading dashboard
            </h3>
            <p className="text-sm text-red-700 mt-2">
              {error.response?.data?.error || 'Something went wrong'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    accounts,
    monthlySummary,
    quarterlySummary,
    taxJarStatus,
    recentTransactions,
    incomeTrend,
    alerts
  } = dashboardData;

  // Calculate invoice metrics
  const getInvoiceMetrics = () => {
    // Extract the invoices array from the response object
    const invoices = invoiceData?.invoices || [];
    
    if (!Array.isArray(invoices)) {
      return { pending: 0, paid: 0, totalPending: 0, totalPaid: 0, thisMonth: 0, thisMonthValue: 0 };
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const pending = invoices.filter(inv => inv.status === 'pending');
    const paid = invoices.filter(inv => inv.status === 'paid');
    const thisMonthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    });

    return {
      pending: pending.length,
      paid: paid.length,
      totalPending: pending.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: paid.reduce((sum, inv) => sum + inv.total, 0),
      thisMonth: thisMonthInvoices.length,
      thisMonthValue: thisMonthInvoices.reduce((sum, inv) => sum + inv.total, 0)
    };
  };

  const invoiceMetrics = getInvoiceMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your finances.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-md border
                ${alert.type === 'warning' 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                  : 'bg-blue-50 border-blue-200 text-blue-800'
                }
              `}
            >
              <div className="flex">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.action && (
                    <p className="text-sm mt-1">{alert.action}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <QuickStats 
        accounts={accounts}
        monthlySummary={monthlySummary}
        taxJarStatus={taxJarStatus}
      />

      {/* Invoice Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invoice Overview</h3>
          <a 
            href="/invoices" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </a>
        </div>
        {invoicesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            Error loading invoices: {invoicesError.message || 'Unknown error'}
          </div>
        )}
        {invoicesLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            Loading invoices...
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{invoiceMetrics.thisMonth}</p>
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-xs text-gray-500">${invoiceMetrics.thisMonthValue.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{invoiceMetrics.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-xs text-gray-500">${invoiceMetrics.totalPending.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{invoiceMetrics.paid}</p>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-xs text-gray-500">${invoiceMetrics.totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {Array.isArray(invoiceData?.invoices) ? invoiceData.invoices.length : 0}
            </p>
            <p className="text-sm text-gray-600">Total Invoices</p>
            <p className="text-xs text-gray-500">
              ${(invoiceMetrics.totalPaid + invoiceMetrics.totalPending).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Income Trend</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Last 6 months</span>
              </div>
            </div>
            <IncomeChart data={incomeTrend} />
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <RecentTransactions transactions={recentTransactions} />
          </div>
        </div>

        {/* Right Column - Tax Jar and Summary */}
        <div className="space-y-6">
          {/* Tax Jar Widget */}
          <TaxJarWidget taxJarStatus={taxJarStatus} />

          {/* Notification Widget */}
          <NotificationWidget />

          {/* Smart Categorization Widget */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Smart Categorization</h3>
                <div className="p-2 bg-blue-100 rounded-full">
                  <SparklesIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Accuracy this month</span>
                  <span className="font-semibold text-blue-600">87%</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Manual corrections</span>
                  <span className="font-semibold text-gray-900">12</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Transactions processed</span>
                  <span className="font-semibold text-gray-900">145</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/transactions/retrain-model', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        const data = await response.json();
                        alert(data.message);
                      } catch (error) {
                        console.error('Error retraining model:', error);
                      }
                    }}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center"
                  >
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    Update AI Model
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Client Overview Widget */}
          <ClientOverviewWidget />

          {/* Quarterly Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              This Quarter
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Business Income</span>
                <span className="font-semibold text-green-600">
                  ${quarterlySummary.businessIncome?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Business Expenses</span>
                <span className="font-semibold text-red-600">
                  ${quarterlySummary.businessExpenses?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Deductible Expenses</span>
                <span className="font-semibold text-blue-600">
                  ${quarterlySummary.deductibleExpenses?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Net Income</span>
                  <span className="font-bold text-lg text-gray-900">
                    ${(quarterlySummary.businessIncome - quarterlySummary.businessExpenses)?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Accounts Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Connected Accounts
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Accounts</span>
                <span className="font-semibold">{accounts.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Balance</span>
                <span className="font-semibold text-green-600">
                  ${accounts.totalBalance?.toLocaleString() || '0'}
                </span>
              </div>
              {accounts.byPlatform && Object.entries(accounts.byPlatform).map(([platform, count]) => (
                <div key={platform} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{platform}</span>
                  <span className="text-sm font-medium">{count} account{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Client Overview Widget Component
const ClientOverviewWidget = () => {
  const { data: clientData, isLoading } = useQuery(
    'clientDashboard',
    () => axios.get('/api/clients/dashboard').then(res => res.data),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, clientsWithDebt } = clientData || {};

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Client Overview</h3>
        <div className="p-2 bg-blue-100 rounded-full">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Clients</span>
          <span className="font-semibold text-gray-900">{summary?.totalClients || 0}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Clients</span>
          <span className="font-semibold text-green-600">{summary?.activeClients || 0}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Outstanding Payments</span>
          <span className={`font-semibold ${(summary?.totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${summary?.totalOutstanding?.toLocaleString() || '0'}
          </span>
        </div>

        {clientsWithDebt && clientsWithDebt.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Who Owes Money</span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                {clientsWithDebt.length}
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {clientsWithDebt.slice(0, 3).map(client => (
                <div key={client._id} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {client.name}
                    </p>
                    {client.company && (
                      <p className="text-xs text-gray-500 truncate">
                        {client.company}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-red-600">
                    ${client.outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
              ))}
              {clientsWithDebt.length > 3 && (
                <p className="text-xs text-gray-500 text-center pt-1">
                  +{clientsWithDebt.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="pt-3 border-t border-gray-200">
          <a 
            href="/clients"
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center"
          >
            <Users className="h-4 w-4 mr-1" />
            View All Clients
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
