'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConversionChart from '@/app/components/ConversionChart';
import CurrencyConverter from '@/app/components/CurrencyConverter';
import { fetchBitcoinPriceHistory, isSupportedCurrency, SUPPORTED_FIATS, getCurrencyName } from '@/services/coingeckoService';

export default function ConversionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [currentBtcPrice, setCurrentBtcPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [yearlyChangePercent, setYearlyChangePercent] = useState<number>(0);
  const [initialFiatValue, setInitialFiatValue] = useState<string>('1');
  const [initialSatsValue, setInitialSatsValue] = useState<string | null>(null);
  
  // Get and validate the currency code from URL parameters
  useEffect(() => {
    if (!params.currency) return;
    
    let currency = String(params.currency).toLowerCase();
    
    // Get fiat value from URL if present
    const fiatAmount = searchParams.get('fiat');
    
    // Get satoshi value from URL if present
    const satAmount = searchParams.get('sat');
    
    // Handle the case where both fiat and satoshi values are present
    // If both are specified, ignore the satoshi value
    if (fiatAmount && satAmount) {
      // Redirect to remove the sat parameter
      const queryParams = new URLSearchParams();
      queryParams.set('fiat', fiatAmount);
      
      router.replace(`/convert/${currency}?${queryParams.toString()}`);
      setInitialFiatValue(fiatAmount);
      setInitialSatsValue(null);
    } else if (fiatAmount) {
      setInitialFiatValue(fiatAmount);
      setInitialSatsValue(null);
    } else if (satAmount) {
      setInitialFiatValue('');
      setInitialSatsValue(satAmount);
    }
    
    // Validate if it's a supported currency
    if (!isSupportedCurrency(currency)) {
      // Redirect to USD, preserving query parameters
      const queryParams = new URLSearchParams(searchParams);
      router.replace(`/convert/usd${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      return;
    }
    
    setCurrencyCode(currency);
  }, [params.currency, router, searchParams]);
  
  // Fetch price data when currency code changes
  useEffect(() => {
    if (!currencyCode) return;
    
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch historical price data for the selected currency - this now also includes current price
        const priceData = await fetchBitcoinPriceHistory(currencyCode);
        
        if (!priceData.marketChart.prices || priceData.marketChart.prices.length === 0) {
          throw new Error(`Failed to fetch historical price data for ${currencyCode}`);
        }
        
        // Set price history from the market chart data
        setPriceHistory(priceData.marketChart.prices);
        
        // Set current BTC price from the market chart data (latest price point)
        setCurrentBtcPrice(priceData.currentPrice);
        
        // Calculate yearly percentage change
        const oldestPriceInBtc = priceData.marketChart.prices[0][1];
        const newestPriceInBtc = priceData.marketChart.prices[priceData.marketChart.prices.length - 1][1];
        
        // For satoshi value, we need to invert the percentage calculation
        // If BTC price in fiat goes up, satoshi value of fiat goes down and vice versa
        const oldestSatValue = 100000000 / oldestPriceInBtc;
        const newestSatValue = 100000000 / newestPriceInBtc;
        const yearlyChange = ((newestSatValue - oldestSatValue) / oldestSatValue) * 100;
        
        setYearlyChangePercent(yearlyChange);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currencyCode]);
  
  // Handle currency change selection
  const handleCurrencyChange = (newCurrency: string, fiatValue?: string) => {
    if (newCurrency !== currencyCode) {
      // Construct query parameters based on which value is active
      const queryParams = new URLSearchParams();
      
      if (fiatValue && fiatValue !== '') {
        queryParams.set('fiat', fiatValue);
      } else if (initialSatsValue) {
        queryParams.set('sat', initialSatsValue);
      }
      
      // Build URL with appropriate query parameters
      const queryString = queryParams.toString();
      const url = `/convert/${newCurrency.toLowerCase()}${queryString ? `?${queryString}` : ''}`;
      
      router.push(url);
    }
  };
  
  // Calculate latest satoshi value for this currency
  const calculateLatestSatValue = (): number => {
    if (!currentBtcPrice || currentBtcPrice <= 0) return 0;
    return 100000000 / currentBtcPrice; // Sats per fiat unit
  };
  
  // Content loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading currency data...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <p className="mt-2">
            <Link href="/" className="underline">
              Return to home page
            </Link>
          </p>
        </div>
      </div>
    );
  }
  
  // Main content
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Page title */}
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-montserrat font-semibold text-center mb-8 text-gray-800 dark:text-gray-100">
        Convert between Satoshis & {getCurrencyName(currencyCode)}
      </h1>
      
      {/* Conversion calculator */}
      <CurrencyConverter 
        currencyCode={currencyCode} 
        btcPrice={currentBtcPrice} 
        onCurrencyChange={handleCurrencyChange}
        initialFiatValue={initialFiatValue}
        initialSatsValue={initialSatsValue || undefined}
      />
      
      {/* Conversion chart */}
      {priceHistory.length > 0 && (
        <ConversionChart
          currencyCode={currencyCode}
          targetPriceData={priceHistory}
          latestSatValue={calculateLatestSatValue()}
          yearlyChangePercent={yearlyChangePercent}
        />
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-gray-400 dark:text-gray-500 text-sm p-4">
        <p>© {new Date().getFullYear()} Satoshis Forex | Created by <a href="https://nakamotolabs.io" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline">Nakamoto Labs</a> | Data: CoinGecko, IMF</p>
      </footer>
    </div>
  );
} 