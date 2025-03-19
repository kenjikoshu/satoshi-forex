'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useTheme } from 'next-themes';
import { 
  fiatToSats, satsToFiat, 
  satsToBtc, btcToSats, 
  fiatToBtc, btcToFiat,
  formatNumber
} from '@/utils/currencyUtils';
import { SUPPORTED_FIATS } from '@/services/coingeckoService';

interface CurrencyConverterProps {
  currencyCode: string;
  btcPrice: number;
  onCurrencyChange: (newCurrency: string) => void;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  currencyCode,
  btcPrice,
  onCurrencyChange,
}) => {
  // State for input values
  const [fiatValue, setFiatValue] = useState<string>('1');
  const [btcValue, setBtcValue] = useState<string>('');
  const [satsValue, setSatsValue] = useState<string>('');
  
  // Track which input was last modified to avoid circular updates
  const [lastModified, setLastModified] = useState<'fiat' | 'btc' | 'sats'>('fiat');
  
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  // Update values when currency or BTC price changes
  useEffect(() => {
    if (btcPrice <= 0) return;
    
    // Recalculate based on the last modified input
    updateFromFiat(fiatValue);
    setLastModified('fiat');
  }, [currencyCode, btcPrice]);
  
  // Validate numeric input - allows only numbers and decimal point
  const validateNumericInput = (value: string): boolean => {
    return /^[0-9]*\.?[0-9]*$/.test(value) || value === '';
  };
  
  // Update all values when fiat input changes
  const updateFromFiat = (value: string) => {
    if (!validateNumericInput(value)) return;
    
    setFiatValue(value);
    
    if (value === '' || btcPrice <= 0) {
      setBtcValue('');
      setSatsValue('');
      return;
    }
    
    const fiatNum = parseFloat(value);
    const btcNum = fiatToBtc(fiatNum, btcPrice);
    const satsNum = btcToSats(btcNum);
    
    setBtcValue(formatNumberWithPrecision(btcNum, 8));
    setSatsValue(formatNumberWithPrecision(satsNum, 0));
  };
  
  // Update all values when BTC input changes
  const updateFromBtc = (value: string) => {
    if (!validateNumericInput(value)) return;
    
    setBtcValue(value);
    
    if (value === '' || btcPrice <= 0) {
      setFiatValue('');
      setSatsValue('');
      return;
    }
    
    const btcNum = parseFloat(value);
    const fiatNum = btcToFiat(btcNum, btcPrice);
    const satsNum = btcToSats(btcNum);
    
    setFiatValue(formatNumberWithPrecision(fiatNum, 2));
    setSatsValue(formatNumberWithPrecision(satsNum, 0));
  };
  
  // Update all values when satoshis input changes
  const updateFromSats = (value: string) => {
    if (!validateNumericInput(value)) return;
    
    setSatsValue(value);
    
    if (value === '' || btcPrice <= 0) {
      setFiatValue('');
      setBtcValue('');
      return;
    }
    
    const satsNum = parseFloat(value);
    const btcNum = satsToBtc(satsNum);
    const fiatNum = btcToFiat(btcNum, btcPrice);
    
    setFiatValue(formatNumberWithPrecision(fiatNum, 2));
    setBtcValue(formatNumberWithPrecision(btcNum, 8));
  };
  
  // Handle input changes
  const handleFiatChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLastModified('fiat');
    updateFromFiat(e.target.value);
  };
  
  const handleBtcChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLastModified('btc');
    updateFromBtc(e.target.value);
  };
  
  const handleSatsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLastModified('sats');
    updateFromSats(e.target.value);
  };
  
  // Handle currency selection change
  const handleCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onCurrencyChange(e.target.value);
  };
  
  // Format number with appropriate precision
  const formatNumberWithPrecision = (num: number, precision: number): string => {
    return num.toLocaleString('en-US', {
      maximumFractionDigits: precision,
      useGrouping: false,
    });
  };
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Fiat Currency Input */}
      <div className="mb-6">
        <div className="flex">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fiat Currency
            </label>
            <div className="flex rounded-md shadow-sm">
              <select
                className="rounded-l-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-16 px-2 py-2.5 text-sm"
                value={currencyCode}
                onChange={handleCurrencyChange}
              >
                {SUPPORTED_FIATS.map((code) => (
                  <option key={code} value={code}>
                    {code.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="flex-1 rounded-r-md bg-gray-50 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-sm"
                inputMode="decimal"
                value={fiatValue}
                onChange={handleFiatChange}
                placeholder="Enter amount"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Bitcoin Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bitcoin (BTC)
        </label>
        <div className="flex rounded-md shadow-sm">
          <span className="inline-flex items-center justify-center w-16 text-sm rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            BTC
          </span>
          <input
            type="text"
            className="rounded-r-md bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-sm"
            inputMode="decimal"
            value={btcValue}
            onChange={handleBtcChange}
            placeholder="Enter amount"
          />
        </div>
      </div>
      
      {/* Satoshis Input */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Satoshis (sats)
        </label>
        <div className="flex rounded-md shadow-sm">
          <span className="inline-flex items-center justify-center w-16 text-sm rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            sats
          </span>
          <input
            type="text"
            className="rounded-r-md bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-sm"
            inputMode="decimal"
            value={satsValue}
            onChange={handleSatsChange}
            placeholder="Enter amount"
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        1 Bitcoin = 100,000,000 Satoshis
      </div>
    </div>
  );
};

export default CurrencyConverter; 