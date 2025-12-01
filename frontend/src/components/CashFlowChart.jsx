import React, { useRef, useEffect, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const CashFlowChart = ({ compact = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const baselineSeriesRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  const [timeRange, setTimeRange] = useState('30days');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  console.log('[CashFlowChart] Component rendered, compact:', compact);

  useEffect(() => {
    console.log('[CashFlowChart] Loading chart data for range:', timeRange);
    loadChartData();
  }, [timeRange]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (chartData && chartContainerRef.current) {
      initializeChart();
    }

    return () => {
      // Mark as unmounted first
      isMountedRef.current = false;
      
      // Remove resize handler BEFORE disposing chart
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      
      // Then dispose of the chart
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          console.warn('[CashFlowChart] Chart already disposed:', error);
        }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        baselineSeriesRef.current = null;
      }
    };
  }, [chartData]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      console.log('[CashFlowChart] Fetching data from API...');
      const response = await api.get(`/analytics/cashflow/candlestick?range=${timeRange}`);
      console.log('[CashFlowChart] Data received:', response.data);
      setChartData(response.data);
    } catch (error) {
      console.error('[CashFlowChart] Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeChart = () => {
    if (!chartContainerRef.current || !chartData) return;

    // Remove existing chart if any
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        console.warn('[CashFlowChart] Error removing existing chart:', error);
      }
      chartRef.current = null;
    }

    const chartHeight = compact ? 300 : 400;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#9B9B9B',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#9B9B9B',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'en-US',
      },
    });

    chartRef.current = chart;

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#059669',
      borderDownColor: '#DC2626',
      wickUpColor: '#059669',
      wickDownColor: '#DC2626',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Set candlestick data
    candlestickSeries.setData(chartData.data);

    // Add baseline (average daily income) as a reference line (v5 API)
    const baselineSeries = chart.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 2,
      lineStyle: 2, // Dashed line
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
    });

    baselineSeriesRef.current = baselineSeries;

    // Create baseline data (horizontal line at avg daily income)
    const baselineData = chartData.data.map(d => ({
      time: d.time,
      value: chartData.avgDailyIncome
    }));

    baselineSeries.setData(baselineData);

    // Handle resize with safety checks
    const handleResize = () => {
      // Only resize if component is still mounted and chart exists
      if (!isMountedRef.current || !chartRef.current || !chartContainerRef.current) {
        return;
      }
      
      try {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      } catch (error) {
        // Silently ignore errors from disposed chart
        console.debug('[CashFlowChart] Resize skipped, chart may be disposed');
      }
    };

    resizeHandlerRef.current = handleResize;
    window.addEventListener('resize', handleResize);

    // Fit content
    try {
      chart.timeScale().fitContent();
    } catch (error) {
      console.warn('[CashFlowChart] Error fitting content:', error);
    }

    // Note: cleanup is handled in the main useEffect return
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-green-600" />
            <span className="text-lg">Daily Cash Flow</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.data.length === 0) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-green-600" />
            <span className="text-lg">Daily Cash Flow</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <Activity className="h-20 w-20 text-gray-300 mb-4" />
            <p className="text-xl font-semibold">No cash flow data yet</p>
            <p className="text-sm mt-2">Link an account to start tracking your daily spending</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
      <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-green-600" />
            <CardTitle className="text-lg">Daily Cash Flow</CardTitle>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: '30days', label: '30D' },
              { value: '3months', label: '3M' },
              { value: '6months', label: '6M' },
              { value: '12months', label: '12M' },
              { value: 'ytd', label: 'YTD' }
            ].map(range => (
              <Button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                variant={timeRange === range.value ? 'default' : 'outline'}
                size="sm"
                className={timeRange === range.value 
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white' 
                  : ''
                }
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Chart Legend & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="w-3 h-0.5 bg-kindling-fire" style={{ borderTop: '2px dashed #3B82F6' }}></div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Avg Daily Income</p>
              <p className="font-bold text-kindling-fire">{formatCurrency(chartData.avgDailyIncome)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Under Budget</p>
              <p className="font-bold text-green-600">Green Candles</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Over Budget</p>
              <p className="font-bold text-red-600">Red Candles</p>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div ref={chartContainerRef} className="w-full" />

        {/* Chart Description */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>How to read this chart:</strong> Each candlestick represents one day. 
            The blue dashed line shows your average daily income ({formatCurrency(chartData.avgDailyIncome)}). 
            Green candles mean you spent less than average (saved money), 
            while red candles mean you spent more than average.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashFlowChart;
