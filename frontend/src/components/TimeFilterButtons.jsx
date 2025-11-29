import React from 'react';
import { Button } from './ui/button';

const TimeFilterButtons = ({ value, onChange, className = '' }) => {
  const timeFilters = [
    { value: 'THIS_MONTH', label: 'This Month', days: null },
    { value: '1M', label: '1M', days: 30 },
    { value: '3M', label: '3M', days: 90 },
    { value: '6M', label: '6M', days: 180 },
    { value: '1Y', label: '1Y', days: 365 },
    { value: 'YTD', label: 'YTD', days: null }
  ];

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {timeFilters.map(filter => (
        <Button
          key={filter.value}
          onClick={() => onChange(filter.value, filter.days)}
          variant={value === filter.value ? 'default' : 'outline'}
          size="sm"
          className={value === filter.value 
            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' 
            : 'hover:bg-orange-50 dark:hover:bg-gray-800'
          }
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

export default TimeFilterButtons;
