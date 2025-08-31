import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import CategorizationModal from '../components/CategorizationModal';
import ManualTransactionModal from '../components/ManualTransactionModal';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    businessClassification: '',
    startDate: '',
    endDate: '',
    deductibleOnly: false
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showCategorizationModal, setShowCategorizationModal] = useState(false);
  const [showManualTransactionModal, setShowManualTransactionModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [filters, page]);

  const fetchTransactions = async (resetPage = false) => {
    try {
      const currentPage = resetPage ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });

      const response = await fetch(`/api/transactions?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (resetPage) {
          setTransactions(data.transactions);
          setPage(1);
        } else {
          setTransactions(prev => currentPage === 1 ? data.transactions : [...prev, ...data.transactions]);
        }
        
        setHasMore(data.transactions.length === 20);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    fetchTransactions(true);
  };

  const handleEditCategorization = (transaction) => {
    setSelectedTransaction(transaction);
    setShowCategorizationModal(true);
  };

  const handleCategorizationUpdate = (updatedTransaction) => {
    setTransactions(prev => 
      prev.map(t => t._id === updatedTransaction._id ? updatedTransaction : t)
    );
  };

  const handleTransactionCreated = (newTransaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'income':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      default:
        return <BanknotesIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBusinessClassificationBadge = (classification) => {
    const colors = {
      business: 'bg-blue-100 text-blue-800',
      personal: 'bg-gray-100 text-gray-800',
      mixed: 'bg-purple-100 text-purple-800',
      unknown: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[classification] || colors.unknown}`}>
        {classification}
      </span>
    );
  };

  const getTaxDeductibleBadge = (taxDeductible) => {
    if (!taxDeductible.isDeductible) return null;
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Tax Deductible
      </span>
    );
  };

  const getCategoryDisplay = (category) => {
    if (!category.primary) return 'Uncategorized';
    
    const confidence = category.confidence || 0;
    const isLowConfidence = confidence < 0.5;
    
    return (
      <div className="flex items-center">
        <span className={isLowConfidence ? 'text-orange-600' : 'text-gray-900'}>
          {category.primary.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {isLowConfidence && (
          <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 ml-1" title="Low confidence categorization" />
        )}
        {confidence > 0.8 && (
          <SparklesIcon className="h-4 w-4 text-blue-500 ml-1" title="High confidence AI categorization" />
        )}
      </div>
    );
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.merchantName && transaction.merchantName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your financial transactions with smart categorization
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Advanced Filters
          </button>
          <button 
            onClick={() => setShowManualTransactionModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="ad_revenue">Ad Revenue</option>
            <option value="sponsorship">Sponsorship</option>
            <option value="equipment">Equipment</option>
            <option value="software">Software</option>
            <option value="groceries">Groceries</option>
            <option value="utilities">Utilities</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          {/* Business Classification Filter */}
          <select
            value={filters.businessClassification}
            onChange={(e) => handleFilterChange('businessClassification', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Classifications</option>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* Tax Deductible Filter */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.deductibleOnly}
              onChange={(e) => handleFilterChange('deductibleOnly', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Tax Deductible Only</span>
          </label>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Type Icon */}
                    <div className="flex-shrink-0">
                      {getTypeIcon(transaction.type)}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </h3>
                        {transaction.merchantName && (
                          <span className="text-sm text-gray-500">
                            • {transaction.merchantName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        {getCategoryDisplay(transaction.category)}
                        {getBusinessClassificationBadge(transaction.businessClassification)}
                        {getTaxDeductibleBadge(transaction.taxDeductible)}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.currency}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditCategorization(transaction)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                        title="Edit categorization"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {transaction.notes && (
                  <div className="mt-3 pl-8">
                    <p className="text-sm text-gray-600 italic">{transaction.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="p-4 text-center border-t">
            <button
              onClick={() => {
                setPage(prev => prev + 1);
                fetchTransactions();
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Load More Transactions
            </button>
          </div>
        )}
      </div>

      {/* Categorization Modal */}
      <CategorizationModal
        isOpen={showCategorizationModal}
        onClose={() => setShowCategorizationModal(false)}
        transaction={selectedTransaction}
        onUpdate={handleCategorizationUpdate}
      />

      {/* Manual Transaction Modal */}
      <ManualTransactionModal
        isOpen={showManualTransactionModal}
        onClose={() => setShowManualTransactionModal(false)}
        onTransactionCreated={handleTransactionCreated}
      />
    </div>
  );
};

export default Transactions;
