import React from 'react';
import { Receipt, Plus, Filter } from 'lucide-react';

const Transactions = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Transactions Page</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            This page will show all your transactions with advanced filtering, categorization, 
            and bulk editing capabilities.
          </p>
          <div className="mt-6">
            <p className="text-sm text-primary-600 font-medium">Coming in the full implementation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
