import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calculator, TrendingUp, Target } from 'lucide-react';
import RetirementPlanner from './RetirementPlanner';
import DebtPayoff from './DebtPayoff';
import SpendingForecast from './SpendingForecast';

const PlanningTools = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'retirement');

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Planning Tools
        </h1>
        <p className="text-gray-600 mt-2">Strategic financial planning calculators and forecasting</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="retirement" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Retirement
          </TabsTrigger>
          <TabsTrigger value="debt" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Debt Payoff
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="retirement" className="mt-6">
          <div className="-mt-8">
            <RetirementPlanner />
          </div>
        </TabsContent>

        <TabsContent value="debt" className="mt-6">
          <div className="-mt-8">
            <DebtPayoff />
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <div className="-mt-8">
            <SpendingForecast />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlanningTools;
