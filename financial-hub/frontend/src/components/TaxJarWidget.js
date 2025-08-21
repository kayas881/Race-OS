import React from 'react';
import { PiggyBank, AlertTriangle, Calendar, DollarSign } from 'lucide-react';

const TaxJarWidget = ({ taxJarStatus }) => {
  const {
    currentAmount = 0,
    targetPercentage = 0.25,
    nextQuarterlyDue,
    estimatedQuarterlyPayment = 0,
    recommendations = ''
  } = taxJarStatus;

  // Calculate progress towards quarterly payment
  const progressPercentage = estimatedQuarterlyPayment > 0 
    ? Math.min((currentAmount / estimatedQuarterlyPayment) * 100, 100)
    : 0;

  // Determine status color
  const getStatusColor = () => {
    if (progressPercentage >= 90) return 'green';
    if (progressPercentage >= 70) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor();
  const statusColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  const backgroundColors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200'
  };

  const textColors = {
    green: 'text-green-800',
    yellow: 'text-yellow-800',
    red: 'text-red-800'
  };

  // Calculate days until next quarterly payment
  const daysUntilDue = nextQuarterlyDue 
    ? Math.ceil((new Date(nextQuarterlyDue) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`rounded-lg border-2 p-6 ${backgroundColors[statusColor]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${textColors[statusColor]} flex items-center`}>
          <PiggyBank className="h-5 w-5 mr-2" />
          Tax Jar
        </h3>
        {progressPercentage < 70 && (
          <AlertTriangle className={`h-5 w-5 ${textColors[statusColor]}`} />
        )}
      </div>

      {/* Current Amount */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-2xl font-bold ${textColors[statusColor]}`}>
            ${currentAmount.toLocaleString()}
          </span>
          <span className={`text-sm ${textColors[statusColor]}`}>
            {(targetPercentage * 100).toFixed(1)}% rate
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/50 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${statusColors[statusColor]}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className={textColors[statusColor]}>
            ${currentAmount.toLocaleString()} saved
          </span>
          <span className={textColors[statusColor]}>
            ${estimatedQuarterlyPayment.toLocaleString()} needed
          </span>
        </div>
      </div>

      {/* Next Payment Due */}
      {nextQuarterlyDue && (
        <div className={`mb-4 p-3 bg-white/50 rounded-md`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className={`h-4 w-4 mr-2 ${textColors[statusColor]}`} />
              <span className={`text-sm font-medium ${textColors[statusColor]}`}>
                Next Quarterly Due
              </span>
            </div>
            <span className={`text-sm font-semibold ${textColors[statusColor]}`}>
              {daysUntilDue > 0 ? `${daysUntilDue} days` : 'Overdue'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${textColors[statusColor]}`}>
            {new Date(nextQuarterlyDue).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <div className={`text-sm ${textColors[statusColor]} bg-white/30 p-3 rounded-md`}>
          <p className="font-medium mb-1">Recommendation:</p>
          <p>{recommendations}</p>
        </div>
      )}

      {/* Quick Action */}
      <div className="mt-4 pt-4 border-t border-white/30">
        <p className={`text-sm ${textColors[statusColor]} text-center`}>
          💡 Set aside <strong>{(targetPercentage * 100).toFixed(1)}%</strong> of each payment for taxes
        </p>
      </div>
    </div>
  );
};

export default TaxJarWidget;
