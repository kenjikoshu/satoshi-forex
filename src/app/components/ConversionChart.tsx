'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDate, formatNumber } from '@/utils/currencyUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ConversionChartProps {
  currencyCode: string;
  targetPriceData: [number, number][]; // [timestamp, price] pairs
  usdPriceData?: [number, number][]; // [timestamp, price] pairs (USD comparison data)
  latestSatValue: number;
  yearlyChangePercent: number;
}

const ConversionChart: React.FC<ConversionChartProps> = ({
  currencyCode,
  targetPriceData,
  usdPriceData,
  latestSatValue,
  yearlyChangePercent,
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Calculate percentage change for USD data relative to first data point
  const calculatePercentageChanges = (data: [number, number][]): number[] => {
    if (!data || data.length === 0) return [];
    
    const firstValue = data[0] ? 100000000 / data[0][1] : 0; // First satoshi value
    if (firstValue === 0) return [];
    
    return data.map(pair => {
      const satValue = 100000000 / pair[1];
      return ((satValue - firstValue) / firstValue) * 100;
    });
  };

  // Normalize data to ensure both datasets start at the same point
  const normalizeDatasets = (
    targetData: [number, number][], 
    usdData?: [number, number][]
  ): { 
    dates: string[],
    targetSatValues: number[],
    targetPercentChanges: number[],
    usdPercentChanges: number[]
  } => {
    if (!targetData || targetData.length === 0) {
      return { dates: [], targetSatValues: [], targetPercentChanges: [], usdPercentChanges: [] };
    }

    // Get dates from target data
    const dates = targetData.map(pair => {
      const date = new Date(pair[0]);
      return date.toLocaleDateString('en-US', { month: 'short' });
    });

    // Calculate Satoshi values for target currency
    const targetSatValues = targetData.map(pair => {
      const btcPrice = pair[1];
      return btcPrice ? 100000000 / btcPrice : 0;
    });

    // Calculate percentage changes for target currency
    const firstTargetSatValue = targetSatValues[0];
    const targetPercentChanges = targetSatValues.map(value => 
      ((value - firstTargetSatValue) / firstTargetSatValue) * 100
    );
    
    // Explicitly set first point to 0% for proper alignment
    if (targetPercentChanges.length > 0) {
      targetPercentChanges[0] = 0;
    }

    // Calculate USD percentage changes if USD data provided
    let usdPercentChanges: number[] = [];
    if (usdData && usdData.length > 0) {
      const usdSatValues = usdData.map(pair => {
        const btcPrice = pair[1];
        return btcPrice ? 100000000 / btcPrice : 0;
      });

      const firstUsdSatValue = usdSatValues[0];
      usdPercentChanges = usdSatValues.map(value => 
        ((value - firstUsdSatValue) / firstUsdSatValue) * 100
      );
      
      // Explicitly set first point to 0% for proper alignment
      if (usdPercentChanges.length > 0) {
        usdPercentChanges[0] = 0;
      }

      // Ensure both datasets have the same length
      const minLength = Math.min(targetPercentChanges.length, usdPercentChanges.length);
      targetPercentChanges.length = minLength;
      usdPercentChanges.length = minLength;
    }

    return {
      dates: dates.slice(0, targetPercentChanges.length),
      targetSatValues: targetSatValues.slice(0, targetPercentChanges.length),
      targetPercentChanges,
      usdPercentChanges
    };
  };

  // Format the data for the chart
  const prepareChartData = (): ChartData<'line'> => {
    const { 
      dates, 
      targetSatValues, 
      targetPercentChanges, 
      usdPercentChanges 
    } = normalizeDatasets(targetPriceData, usdPriceData);

    // Prepare datasets
    const datasets = [
      {
        label: `${currencyCode.toUpperCase()} to Sat`,
        data: targetSatValues,
        borderColor: isDarkMode ? '#fb923c' : '#f97316', // Orange color
        backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.5)' : 'rgba(249, 115, 22, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y', // Left axis - raw satoshi values
      },
    ];

    // Add USD comparison dataset if provided and not USD
    if (usdPercentChanges.length > 0 && currencyCode.toLowerCase() !== 'usd') {
      datasets.push({
        label: 'USD to Sat (% change)',
        data: usdPercentChanges,
        borderColor: isDarkMode ? '#4ade80' : '#16a34a', // Green color
        backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.5)' : 'rgba(22, 163, 74, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'percentage', // Right axis - percentage changes
      });

      // Add target currency percentage change dataset for proper comparison
      datasets.push({
        label: `${currencyCode.toUpperCase()} to Sat (% change)`,
        data: targetPercentChanges,
        borderColor: isDarkMode ? '#f59e0b' : '#d97706', // Darker orange for distinction
        backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.5)' : 'rgba(217, 119, 6, 0.5)',
        borderWidth: 1, // Thinner line for distinction
        tension: 0.4,
        yAxisID: 'percentage', // Right axis - percentage changes
      });
    }

    return {
      labels: dates,
      datasets,
    };
  };

  // Chart configuration
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#4b5563',
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Satoshi Value',
          color: isDarkMode ? '#d1d5db' : '#374151',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#4b5563',
          callback: (value) => {
            return formatNumber(value as number, 0);
          },
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      percentage: {
        type: 'linear',
        display: usdPriceData && currencyCode.toLowerCase() !== 'usd',
        position: 'right',
        title: {
          display: true,
          text: 'Percentage Change (%)',
          color: isDarkMode ? '#d1d5db' : '#374151',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#4b5563',
          callback: (value) => {
            return `${(value as number).toFixed(1)}%`;
          },
        },
        min: -100, // Set reasonable bounds for percentage changes
        max: 100,  // Adjust these based on your data range if needed
        grid: {
          drawOnChartArea: false, // Only show grid lines for the left axis
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDarkMode ? '#d1d5db' : '#374151',
          font: {
            family: 'var(--font-open-sans)',
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
        titleColor: isDarkMode ? '#f9fafb' : '#111827',
        bodyColor: isDarkMode ? '#d1d5db' : '#374151',
        borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            const datasetLabel = context.dataset.label || '';
            
            // Format differently based on which dataset this is
            if (datasetLabel.includes('% change')) {
              return `${datasetLabel}: ${value.toFixed(2)}%`;
            } else {
              return `${datasetLabel}: ${formatNumber(value, 2)} Sats`;
            }
          }
        }
      },
    },
  };

  // Calculate data for the chart subtitle
  const getLatestDate = (): string => {
    if (targetPriceData.length === 0) return '';
    
    const latestTimestamp = targetPriceData[targetPriceData.length - 1][0];
    const date = new Date(latestTimestamp);
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC';
  };

  // Format the percent change
  const formatPercentChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Get the color for year change text
  const yearChangeColor = yearlyChangePercent >= 0 
    ? (isDarkMode ? 'text-green-400' : 'text-green-600')
    : (isDarkMode ? 'text-red-400' : 'text-red-600');

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-8">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {currencyCode.toUpperCase()} to Sat Chart{' '}
            <span className={yearChangeColor}>
              ({formatPercentChange(yearlyChangePercent)} 1Y)
            </span>
          </h3>
        </div>
        <div className="text-sm text-right text-gray-600 dark:text-gray-400 mt-1 sm:mt-0">
          1 {currencyCode.toUpperCase()} = {formatNumber(latestSatValue, 2)} Sats {getLatestDate()}
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <Line data={prepareChartData()} options={options} />
      </div>
    </div>
  );
};

export default ConversionChart; 