import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import QuickStats from '../components/QuickStats';
import RecentTransactions from '../components/RecentTransactions';
import IncomeChart from '../components/IncomeChart';
import TaxJarWidget from '../components/TaxJarWidget';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText, 
  Clock, 
  Download,
  Calendar,
  PieChart,
  BarChart,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

function Dashboard() {
  const [data, setData] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportLoading, setExportLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('month'); // month, quarter, year

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [dashboardResponse, invoiceResponse] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/invoices', { headers })
      ]);

      if (!dashboardResponse.ok || !invoiceResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const dashboardData = await dashboardResponse.json();
      const invoices = await invoiceResponse.json();

      setData(dashboardData);
      setInvoiceData(invoices);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/export/csv?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `financial-report-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/export/pdf?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `financial-report-${timeframe}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const getInvoiceMetrics = () => {
    if (!invoiceData) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const pending = invoiceData.filter(inv => inv.status === 'pending');
    const paid = invoiceData.filter(inv => inv.status === 'paid');
    const overdue = invoiceData.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      return inv.status === 'pending' && dueDate < new Date();
    });

    const thisMonthInvoices = invoiceData.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    });

    const totalPendingAmount = pending.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaidAmount = paid.reduce((sum, inv) => sum + inv.total, 0);
    const thisMonthAmount = thisMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      totalInvoices: invoiceData.length,
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length,
      totalPendingAmount,
      totalPaidAmount,
      thisMonthAmount,
      thisMonthCount: thisMonthInvoices.length
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const invoiceMetrics = getInvoiceMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Your complete financial overview</p>
        </div>
        <div className="flex space-x-4 items-center">
          {/* Timeframe selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          {/* Export buttons */}
          <button
            onClick={exportToCSV}
            disabled={exportLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={exportLoading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Alerts</h3>
          </div>
          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <div key={index} className="text-sm text-yellow-700">
                <span className="font-medium">{alert.message}</span>
                {alert.action && <span className="text-yellow-600"> - {alert.action}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'invoices', 'transactions', 'tax'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <QuickStats data={data} />

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Monthly Income */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(data?.monthlySummary?.income || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Monthly Expenses */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${(data?.monthlySummary?.expenses || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Income</p>
                  <p className={`text-2xl font-bold ${
                    (data?.monthlySummary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${(data?.monthlySummary?.net || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Accounts */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(data?.accounts?.totalBalance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncomeChart data={data?.incomeTrend} />
            <TaxJarWidget data={data?.taxJarStatus} />
          </div>

          {/* Recent Transactions */}
          <RecentTransactions transactions={data?.recentTransactions} />
        </div>
      )}

      {activeTab === 'invoices' && invoiceMetrics && (
        <div className="space-y-6">
          {/* Invoice Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Invoices */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoiceMetrics.totalInvoices}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {invoiceMetrics.pending}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${invoiceMetrics.totalPendingAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Paid Invoices */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {invoiceMetrics.paid}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${invoiceMetrics.totalPaidAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Overdue Invoices */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {invoiceMetrics.overdue}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* This Month Invoice Performance */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{invoiceMetrics.thisMonthCount}</p>
                <p className="text-sm text-gray-600">Invoices Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${invoiceMetrics.thisMonthAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  ${invoiceMetrics.thisMonthCount > 0 ? (invoiceMetrics.thisMonthAmount / invoiceMetrics.thisMonthCount).toLocaleString() : '0'}
                </p>
                <p className="text-sm text-gray-600">Average Value</p>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData?.slice(0, 5).map((invoice) => (
                    <tr key={invoice._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Transaction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data?.monthlySummary?.transactionCount || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Business Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(data?.quarterlySummary?.businessIncome || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Deductible Expenses</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${(data?.quarterlySummary?.deductibleExpenses || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <RecentTransactions transactions={data?.recentTransactions} />

          {/* Category Breakdown */}
          {data?.categoryBreakdown && (
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.categoryBreakdown.slice(0, 8).map((category, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{category._id.category}</p>
                        <p className="text-sm text-gray-600">{category._id.type} • {category.count} transactions</p>
                      </div>
                      <p className={`font-bold ${
                        category._id.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${category.total.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="space-y-6">
          <TaxJarWidget data={data?.taxJarStatus} />
          
          {/* Tax Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tax Jar Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(data?.taxJarStatus?.currentAmount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Estimated Quarterly</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${(data?.taxJarStatus?.estimatedQuarterlyPayment || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Target Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {((data?.taxJarStatus?.targetPercentage || 0) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Next Payment Due */}
          {data?.taxJarStatus?.nextQuarterlyDue && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Quarterly Payment</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(data.taxJarStatus.nextQuarterlyDue).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Days Remaining</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.ceil((new Date(data.taxJarStatus.nextQuarterlyDue) - new Date()) / (1000 * 60 * 60 * 24))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
