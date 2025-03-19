/**
 * Convert between different currency units (Satoshis, BTC, Fiat)
 */

// Constants
const SATS_PER_BTC = 100000000; // 1 BTC = 100,000,000 Satoshis

/**
 * Convert Satoshis to BTC
 */
export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC;
}

/**
 * Convert BTC to Satoshis
 */
export function btcToSats(btc: number): number {
  return btc * SATS_PER_BTC;
}

/**
 * Convert Fiat to Satoshis
 * @param fiatAmount - Amount in fiat currency
 * @param fiatPerBtc - Price of 1 BTC in fiat currency
 */
export function fiatToSats(fiatAmount: number, fiatPerBtc: number): number {
  if (fiatPerBtc <= 0) return 0;
  return (fiatAmount / fiatPerBtc) * SATS_PER_BTC;
}

/**
 * Convert Satoshis to Fiat
 * @param sats - Amount in satoshis
 * @param fiatPerBtc - Price of 1 BTC in fiat currency
 */
export function satsToFiat(sats: number, fiatPerBtc: number): number {
  return satsToBtc(sats) * fiatPerBtc;
}

/**
 * Convert Fiat to BTC
 * @param fiatAmount - Amount in fiat currency
 * @param fiatPerBtc - Price of 1 BTC in fiat currency
 */
export function fiatToBtc(fiatAmount: number, fiatPerBtc: number): number {
  if (fiatPerBtc <= 0) return 0;
  return fiatAmount / fiatPerBtc;
}

/**
 * Convert BTC to Fiat
 * @param btc - Amount in BTC
 * @param fiatPerBtc - Price of 1 BTC in fiat currency
 */
export function btcToFiat(btc: number, fiatPerBtc: number): number {
  return btc * fiatPerBtc;
}

/**
 * Format number with commas and decimal places
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (isNaN(num)) return '0';
  
  // Handle very small numbers with scientific notation
  if (Math.abs(num) < 0.000001 && num !== 0) {
    return num.toExponential(decimals);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format BTC amount
 */
export function formatBtc(btc: number): string {
  return formatNumber(btc, 8);
}

/**
 * Format Satoshi amount
 */
export function formatSats(sats: number): string {
  return formatNumber(sats, 0);
}

/**
 * Format fiat amount with currency symbol
 */
export function formatFiat(amount: number, currencyCode: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  try {
    return formatter.format(amount);
  } catch (error) {
    // Fallback if currency code is not supported by Intl
    return `${currencyCode.toUpperCase()} ${formatNumber(amount, 2)}`;
  }
}

/**
 * Format date (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get color based on percentage change (positive = green, negative = red)
 */
export function getChangeColor(change: number, isDarkMode: boolean): string {
  if (change > 0) {
    return isDarkMode ? 'text-green-400' : 'text-green-600';
  } else if (change < 0) {
    return isDarkMode ? 'text-red-400' : 'text-red-600';
  }
  return isDarkMode ? 'text-gray-400' : 'text-gray-600';
} 