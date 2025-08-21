import React from 'react';
import { ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const RecentTransactions = ({ transactions = [] }) => {
  const getTransactionIcon = (type) => {
    return type === 'income' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getAmountColor = (type) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  const formatAmount = (amount, type) => {
    const formatted = `$${Math.abs(amount).toLocaleString()}`;
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'ad_revenue': 'bg-blue-100 text-blue-800',
      'sponsorship': 'bg-purple-100 text-purple-800',
      'subscription': 'bg-green-100 text-green-800',
      'donation': 'bg-yellow-100 text-yellow-800',
      'equipment': 'bg-gray-100 text-gray-800',
      'software': 'bg-indigo-100 text-indigo-800',
      'marketing': 'bg-pink-100 text-pink-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No recent transactions found.</p>
        <p className="text-sm text-gray-400 mt-1">
          Connect your accounts to start tracking transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {transactions.map((transaction) => (
        <div key={transaction._id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Transaction Icon */}
              <div className="flex-shrink-0">
                {getTransactionIcon(transaction.type)}
              </div>
              
              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {transaction.description}
                  </p>
                  {transaction.taxDeductible?.isDeductible && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Tax Deductible
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${getCategoryBadgeColor(transaction.category?.primary)}
                  `}>
                    {transaction.category?.primary?.replace('_', ' ')}
                  </span>
                  
                  {transaction.account && (
                    <span className="text-xs text-gray-500">
                      {transaction.account.accountName}
                    </span>
                  )}
                  
                  <span className="text-xs text-gray-500">
                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Amount */}
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold ${getAmountColor(transaction.type)}`}>
                {formatAmount(transaction.amount, transaction.type)}
              </span>
              
              {transaction.businessClassification === 'business' && (
                <div className="w-2 h-2 bg-blue-400 rounded-full" title="Business transaction"></div>
              )}
            </div>
          </div>
          
          {/* Merchant Name */}
          {transaction.merchantName && transaction.merchantName !== transaction.description && (
            <div className="mt-2 ml-7">
              <p className="text-xs text-gray-500">
                {transaction.merchantName}
              </p>
            </div>
          )}
          
          {/* Platform Data for Creator Income */}
          {transaction.platformData && transaction.type === 'income' && (
            <div className="mt-2 ml-7">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {transaction.platformData.viewer_metrics?.views && (
                  <span>{transaction.platformData.viewer_metrics.views.toLocaleString()} views</span>
                )}
                {transaction.platformData.revenue_type && (
                  <span className="capitalize">{transaction.platformData.revenue_type.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* View All Link */}
      <div className="p-4 bg-gray-50">
        <a 
          href="/transactions" 
          className="flex items-center justify-center text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all transactions
          <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>
    </div>
  );
};

export default RecentTransactions;
