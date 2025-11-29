import React from 'react';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, change, changeType, icon: Icon, trend }) => {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';
  
  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
            {change && (
              <div className="flex items-center space-x-1">
                {isPositive && (
                  <TrendingUp size={16} className="text-green-600" />
                )}
                {isNegative && (
                  <TrendingDown size={16} className="text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 
                  isNegative ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {change}
                </span>
                <span className="text-xs text-gray-500">{trend || 'vs last period'}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-gray-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
