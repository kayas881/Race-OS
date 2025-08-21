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
  EyeOff
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import TaxJarWidget from '../components/TaxJarWidget';
import IncomeChart from '../components/IncomeChart';
import RecentTransactions from '../components/RecentTransactions';
import QuickStats from '../components/QuickStats';

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    () => axios.get('/api/dashboard').then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
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

export default Dashboard;
