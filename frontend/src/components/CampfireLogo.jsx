import React from 'react';

const CampfireLogo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`}
      fill="currentColor" 
      viewBox="0 0 24 24"
    >
      {/* Campfire icon - logs and flames */}
      {/* Main large flame */}
      <path d="M12 2C12 2 10 5 10 7.5C10 9.43 11.34 11 13 11C14.66 11 16 9.43 16 7.5C16 5 14 2 14 2C14 2 13 4 12.5 5.5C12.5 5.5 12 3.5 12 2Z" opacity="0.9"/>
      {/* Left flame */}
      <path d="M8 10C8 10 6.5 12 6.5 13.5C6.5 14.88 7.62 16 9 16C10.38 16 11.5 14.88 11.5 13.5C11.5 12 10 10 10 10C10 10 9 11.5 8.5 12.5C8.5 12.5 8 11 8 10Z" opacity="0.8"/>
      {/* Right flame */}
      <path d="M16 10C16 10 14.5 12 14.5 13.5C14.5 14.88 15.62 16 17 16C18.38 16 19.5 14.88 19.5 13.5C19.5 12 18 10 18 10C18 10 17 11.5 16.5 12.5C16.5 12.5 16 11 16 10Z" opacity="0.8"/>
      {/* Logs at bottom */}
      <rect x="4" y="18" width="16" height="2" rx="1" opacity="0.7"/>
      <rect x="6" y="20" width="12" height="2" rx="1" opacity="0.6"/>
    </svg>
  );
};

export default CampfireLogo;
