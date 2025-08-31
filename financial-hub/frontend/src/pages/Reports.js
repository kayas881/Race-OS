import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [reportData, setReportData] = useState({
    cashflow: [],
    categoryBreakdown: [],
    taxForecast: {},
    summary: {},
    trends: {}
  });

  const periods = [
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '12months', label: 'Last 12 Months' },
    { value: 'ytd', label: 'Year to Date' }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/analytics?period=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setReportData(data);
        } else {
          console.error('Error fetching report data');
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/analytics?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        console.error('Error fetching report data');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { cashflow, categoryBreakdown, taxForecast, summary, trends } = reportData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentChartBarIcon className="h-8 w-8 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive financial insights and AI-powered forecasting
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalIncome)}
              </p>
              <div className="flex items-center mt-1">
                {trends.incomeGrowth >= 0 ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ml-1 ${
                  trends.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(Math.abs(trends.incomeGrowth))}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            </div>
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
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
              <div className="flex items-center mt-1">
                {trends.expenseGrowth >= 0 ? (
                  <ArrowUpIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-green-500" />
                )}
                <span className={`text-sm ml-1 ${
                  trends.expenseGrowth >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatPercent(Math.abs(trends.expenseGrowth))}
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
            </div>
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
              <p className="text-sm font-medium text-gray-600">Net Cashflow</p>
              <p className={`text-2xl font-bold ${
                summary.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.netCashflow)}
              </p>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500">
                  {formatPercent((summary.netCashflow / summary.totalIncome) * 100)} profit margin
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-full ${
              summary.netCashflow >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <CurrencyDollarIcon className={`h-6 w-6 ${
                summary.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
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
              <p className="text-sm font-medium text-gray-600">Tax Liability</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(summary.estimatedTax)}
              </p>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500">
                  {formatPercent((summary.estimatedTax / summary.totalIncome) * 100)} effective rate
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ReceiptPercentIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cashflow Chart */}
        <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
              Cashflow Analysis
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Income</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Expenses</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Net</span>
              </div>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1" 
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2" 
                  stroke="#EF4444" 
                  fill="#EF4444"
                  fillOpacity={0.3}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Tax Forecasting */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LightBulbIcon className="h-6 w-6 text-yellow-600" />
              AI Tax Forecast
            </h3>
            <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full">
              AI POWERED
            </span>
          </div>

          <div className="space-y-4">
            {/* Current Quarter Estimate */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Q4 2025 Estimate</span>
                <span className="text-xs text-blue-600 font-medium">
                  {taxForecast.confidence || 85}% Confidence
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {formatCurrency(taxForecast.currentQuarter || 0)}
              </div>
              <div className="text-sm text-gray-600">
                Based on income trends and historical patterns
              </div>
            </div>

            {/* Year-End Projection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">2025 Year-End</span>
                <span className="text-xs text-green-600 font-medium">Projected</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">
                {formatCurrency(taxForecast.yearEnd || 0)}
              </div>
              <div className="text-sm text-gray-600">
                Total estimated tax liability
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">AI Recommendations</h4>
              
              {taxForecast.recommendations?.map((rec, index) => (
                <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
                  rec.priority === 'high' ? 'bg-red-50 border border-red-200' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-green-50 border border-green-200'
                }`}>
                  <div className={`p-1 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100' :
                    rec.priority === 'medium' ? 'bg-yellow-100' :
                    'bg-green-100'
                  }`}>
                    {rec.priority === 'high' ? (
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                    ) : rec.priority === 'medium' ? (
                      <LightBulbIcon className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    {rec.potentialSavings && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Potential savings: {formatCurrency(rec.potentialSavings)}
                      </p>
                    )}
                  </div>
                </div>
              )) || (
                <div className="text-sm text-gray-500 text-center py-4">
                  No recommendations available. Add more transactions for better insights.
                </div>
              )}
            </div>

            {/* Tax Calendar */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Upcoming Tax Dates</h4>
              <div className="space-y-2">
                {(taxForecast.upcomingDates || []).map((date, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{date.description}</span>
                    <span className="font-medium text-gray-900">{date.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <BanknotesIcon className="h-6 w-6 text-blue-600" />
            Expense Categories
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Category Breakdown</h3>
          
          <div className="space-y-3">
            {categoryBreakdown.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(category.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercent((category.amount / summary.totalExpenses) * 100)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
