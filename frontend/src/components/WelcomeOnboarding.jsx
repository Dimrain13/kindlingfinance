import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, ChevronRight, ChevronLeft, Settings, Link, FileText, PieChart, CheckCircle } from 'lucide-react';

const WelcomeOnboarding = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Kindling Financial! 🔥",
      description: "Let's get you set up in just a few minutes. This guide will show you where to find everything.",
      icon: <div className="text-6xl mb-4">🎉</div>,
      action: null
    },
    {
      title: "Step 1: Configure Your Settings",
      description: "Set your household size and monthly income for personalized insights and budget recommendations.",
      icon: <Settings className="h-16 w-16 text-orange-500 mb-4" />,
      location: "Settings page (gear icon in sidebar)",
      action: null
    },
    {
      title: "Step 2: Connect Your Accounts",
      description: "Link your bank accounts to automatically sync transactions and account balances.",
      icon: <Link className="h-16 w-16 text-blue-500 mb-4" />,
      location: "Dashboard → 'Link Account' button",
      action: null
    },
    {
      title: "Step 3: Review Your Transactions",
      description: "Check your synced transactions and let our AI categorize them automatically.",
      icon: <FileText className="h-16 w-16 text-green-500 mb-4" />,
      location: "Transactions page in sidebar",
      action: null
    },
    {
      title: "Step 4: Create Smart Budgets",
      description: "Use our AI-powered suggestions based on your spending and household size to create budgets.",
      icon: <PieChart className="h-16 w-16 text-purple-500 mb-4" />,
      location: "Budgets page → 'Smart Suggestions' button",
      action: null
    },
    {
      title: "You're All Set! 🚀",
      description: "You can now explore all features of Kindling Financial. Track spending, set goals, and optimize your finances!",
      icon: <CheckCircle className="h-16 w-16 text-green-500 mb-4" />,
      action: "close"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    // Mark onboarding as complete
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl shadow-2xl bg-white dark:bg-gray-800 border-0">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl pr-10">
            {step.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-6">
          <div className="text-center">
            <div className="flex justify-center">
              {step.icon}
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {step.description}
            </p>
            {step.location && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📍 Find it here: <span className="font-bold">{step.location}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex items-center gap-2"
              >
                Get Started
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="text-center mt-4">
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
            >
              Skip for now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeOnboarding;
