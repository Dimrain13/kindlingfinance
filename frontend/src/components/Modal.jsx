import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  // Close on ESC key
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className={`w-full ${sizeClasses[size]} my-8 shadow-2xl animate-fadeIn relative bg-white dark:bg-gray-900`}>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <CardHeader className="border-b pb-4 bg-white dark:bg-gray-900">
          <CardTitle className="text-xl font-bold pr-8">{title}</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900">
          {children}
        </CardContent>
      </Card>
    </div>
  );
};

export default Modal;
