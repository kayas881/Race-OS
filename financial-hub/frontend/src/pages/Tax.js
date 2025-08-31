import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  CalculatorIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const Tax = () => {
  const [quarterlyDates, setQuarterlyDates] = useState([]);
  const [quarterlySummary, setQuarterlySummary] = useState({});
  const [ytdLiability, setYtdLiability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTaxData();
  }, [selectedYear]);

  const fetchTaxData = async () => {
    setLoading(true);
    try {
      const [datesRes, summaryRes, liabilityRes] = await Promise.all([
        fetch('/api/tax/quarterly-dates', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/tax/quarterly-summary?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/tax/ytd-liability?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (datesRes.ok) {
        const datesData = await datesRes.json();
        setQuarterlyDates(datesData.upcomingDates);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setQuarterlySummary(summaryData.quarters);
      }

      if (liabilityRes.ok) {
        const liabilityData = await liabilityRes.json();
        setYtdLiability(liabilityData);
      }
    } catch (error) {
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateStatus = (date) => {
    if (date.isPastDue) {
      return {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />,
        status: 'Past Due'
      };
    } else if (date.isUrgent) {
      return {
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: <ClockIcon className="h-5 w-5 text-yellow-500" />,
        status: 'Due Soon'
      };
    } else {
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
        status: 'On Track'
      };
    }
  };

  const recalculateTaxes = async () => {
    setLoading(true);
    await fetchTaxData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time tax calculations and quarterly payment tracking
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2025, 2024, 2023].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={recalculateTaxes}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Recalculate Taxes
          </button>
        </div>
      </div>

      {/* Year-to-Date Summary */}
      {ytdLiability && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Year-to-Date Tax Summary ({selectedYear})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                ${ytdLiability.totalIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                ${ytdLiability.totalDeductions.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Deductions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                ${ytdLiability.netIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Net Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                ${ytdLiability.estimatedTax.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Estimated Tax ({(ytdLiability.effectiveRate * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quarterly Due Dates */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Quarterly Tax Due Dates</h2>
          </div>
        </div>
        <div className="p-6">
          {quarterlyDates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming quarterly dates</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quarterlyDates.map((date, index) => {
                const status = getDateStatus(date);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${status.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {status.icon}
                        <div>
                          <h3 className="font-medium">{date.quarter} 2025</h3>
                          <p className="text-sm">
                            Due: {new Date(date.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{status.status}</p>
                        <p className="text-sm">
                          {date.isPastDue 
                            ? `${Math.abs(date.daysUntil)} days overdue`
                            : `${date.daysUntil} days remaining`
                          }
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quarterly Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Quarterly Breakdown</h2>
          </div>
        </div>
        <div className="p-6">
          {Object.keys(quarterlySummary).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No quarterly data available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(quarterlySummary).map(([quarter, data]) => (
                <motion.div
                  key={quarter}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 mb-3">{quarter}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income:</span>
                      <span className="font-medium text-green-600">
                        ${data.grossIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expenses:</span>
                      <span className="font-medium text-red-600">
                        ${data.businessExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deductible:</span>
                      <span className="font-medium text-blue-600">
                        ${data.deductibleAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-gray-600">Net Income:</span>
                      <span className="font-medium text-gray-900">
                        ${data.netIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Tax:</span>
                      <span className="font-medium text-orange-600">
                        ${data.estimatedTax.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {data.transactionCount} transactions
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tax Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Tax Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Quarterly Payments</h4>
            <p className="text-blue-800">
              Set aside 25-30% of your income for taxes. Make quarterly payments to avoid penalties.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Track Deductions</h4>
            <p className="text-blue-800">
              Keep receipts for business expenses like equipment, software, and home office costs.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Home Office</h4>
            <p className="text-blue-800">
              You may deduct a portion of your home expenses if you use it exclusively for work.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Professional Help</h4>
            <p className="text-blue-800">
              Consider consulting a tax professional for complex situations or audit protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tax;
