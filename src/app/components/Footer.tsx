'use client';

export default function Footer() {
  return (
    <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm pb-4">
      <p>© {new Date().getFullYear()} Satoshis Forex | Created by Nakamoto Labs | Data: CoinGecko, IMF</p>
    </footer>
  );
} 