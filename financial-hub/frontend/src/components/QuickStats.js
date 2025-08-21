import React from 'react';
import { DollarSign, TrendingUp, CreditCard, PiggyBank } from 'lucide-react';

const QuickStats = ({ accounts, monthlySummary, taxJarStatus }) => {
  const stats = [
    {
      name: 'Total Balance',
      value: `$${accounts?.totalBalance?.toLocaleString() || '0'}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: null
    },
    {
      name: 'This Month Income',
      value: `$${monthlySummary?.income?.toLocaleString() || '0'}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: monthlySummary?.net > 0 ? 'positive' : 'negative'
    },
    {
      name: 'Connected Accounts',
      value: accounts?.total || '0',
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: null
    },
    {
      name: 'Tax Jar',
      value: `$${taxJarStatus?.currentAmount?.toLocaleString() || '0'}`,
      icon: PiggyBank,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.bgColor} rounded-md p-3`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  {stat.change && (
                    <span className={`
                      ml-2 text-sm font-medium
                      ${stat.change === 'positive' ? 'text-green-600' : 'text-red-600'}
                    `}>
                      {stat.change === 'positive' ? '↗' : '↘'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuickStats;
