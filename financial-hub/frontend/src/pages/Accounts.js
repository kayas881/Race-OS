import React from 'react';
import { CreditCard, Plus, Link as LinkIcon } from 'lucide-react';

const Accounts = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your bank accounts and creator platform connections
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <LinkIcon className="h-4 w-4 mr-2" />
            Connect Account
          </button>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Account Management</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            This page will allow you to connect and manage your bank accounts, 
            credit cards, and creator platforms like YouTube, Twitch, and Patreon.
          </p>
          <div className="mt-6">
            <p className="text-sm text-primary-600 font-medium">Coming in the full implementation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounts;
