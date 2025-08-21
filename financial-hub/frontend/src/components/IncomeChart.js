import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const IncomeChart = ({ data = [] }) => {
  // Transform data for the chart
  const chartData = data.map(item => ({
    month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    }),
    income: item.total,
    count: item.count
  }));

  // Fill in missing months with 0 values if needed
  const fillMissingMonths = (data) => {
    if (data.length === 0) {
      // Create 6 months of dummy data if no data exists
      const dummyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        dummyData.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          income: 0,
          count: 0
        });
      }
      return dummyData;
    }
    return data;
  };

  const filledData = fillMissingMonths(chartData);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-green-600">
            Income: ${payload[0].value.toLocaleString()}
          </p>
          <p className="text-gray-600 text-sm">
            {payload[0].payload.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filledData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#059669' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeChart;
