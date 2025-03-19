'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // Check if current page is the converter page
  const isConverterPage = pathname?.startsWith('/convert/');

  // Ensure this component only renders client-side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="w-full py-4 px-6 md:px-8 border-b border-gray-200 dark:border-gray-800 bg-transparent">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-montserrat opacity-0">satoshis.forex</div>
          {!isConverterPage && <div className="opacity-0">Converter</div>}
        </div>
      </header>
    );
  }

  return (
    <header className="w-full py-4 px-6 md:px-8 border-b border-gray-200 dark:border-gray-800 bg-transparent">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-montserrat text-xl">
          <span className={`${resolvedTheme === 'dark' ? 'text-orange-400' : 'text-amber-600'} font-[500]`}>
            satoshis
          </span>
          <span className={`${resolvedTheme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#111111]'} font-[300]`}>
            .forex
          </span>
        </Link>
        
        {!isConverterPage && (
          <Link 
            href="/convert/usd" 
            className={`
              font-montserrat text-xl font-[400] 
              ${resolvedTheme === 'dark' ? 'text-[#EEEEEE] hover:text-gray-300' : 'text-[#111111] hover:text-gray-700'}
              transition duration-150 ease-in-out
            `}
          >
            Converter
          </Link>
        )}
      </div>
    </header>
  );
} 