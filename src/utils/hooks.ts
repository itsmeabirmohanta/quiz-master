'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to ensure code only runs on the client side.
 * Helps prevent hydration mismatches by ensuring values that might differ
 * between server and client are only rendered on the client.
 * 
 * @param initialValue The initial value to use before client-side rendering
 * @returns [isClient, value, setValue] - A boolean indicating if we're on the client side, the value, and a setter
 */
export function useClientOnly<T>(initialValue: T): [boolean, T, (value: T) => void] {
  const [isClient, setIsClient] = useState(false);
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return [isClient, value, setValue];
}

/**
 * Format a date string in a consistent way that avoids hydration mismatches
 * @param dateString The date string to format
 * @param options DateTimeFormatOptions
 * @returns The formatted date string
 */
export function useFormattedDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    try {
      const formatter = new Intl.DateTimeFormat('en-US', defaultOptions);
      setFormattedDate(formatter.format(new Date(dateString)));
    } catch (e) {
      console.error('Error formatting date:', e);
      setFormattedDate('Invalid date');
    }
  }, [dateString, options]);

  return isClient ? formattedDate : '';
} 