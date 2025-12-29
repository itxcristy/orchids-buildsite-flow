import { useState, useEffect } from 'react';
import { useAgencySettings } from './useAgencySettings';

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Conversion rate from USD
}

const currencies: Record<string, CurrencyInfo> = {
  IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83 },
  US: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  GB: { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  EU: { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  CA: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.35 },
  AU: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.52 },
  SG: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
  AE: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  default: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83 } // Default to INR
};

export const useCurrency = () => {
  const { settings: agencySettings } = useAgencySettings();
  const [currency, setCurrency] = useState<CurrencyInfo>(currencies.default);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // First, try to get admin-configured currency from agency settings
        if (agencySettings?.default_currency || agencySettings?.currency) {
          const currencyCode = agencySettings.default_currency || agencySettings.currency;
          if (currencyCode && currencies[currencyCode]) {
            setCurrency(currencies[currencyCode]);
            setLoading(false);
            return;
          }
        }

        // Fallback to IP geolocation detection
        try {
          const response = await fetch('https://ipapi.co/json/');
          if (response.ok) {
            const data = await response.json();
            const countryCode = data.country_code;
            
            // Map some common European countries to EU
            const europeanCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'EE', 'LV', 'LT', 'SK', 'SI', 'MT', 'CY', 'LU'];
            const mappedCode = europeanCountries.includes(countryCode) ? 'EU' : countryCode;
            
            const detectedCurrency = currencies[mappedCode] || currencies.default;
            setCurrency(detectedCurrency);
          } else {
            // Final fallback to default currency (INR)
            setCurrency(currencies.default);
          }
        } catch {
          // Final fallback to default currency (INR)
          setCurrency(currencies.default);
        }
      } catch (error) {
        setCurrency(currencies.default);
      } finally {
        setLoading(false);
      }
    };

    detectCurrency();
  }, [agencySettings?.default_currency, agencySettings?.currency]);

  const convertPrice = (usdPrice: number): number => {
    return Math.round(usdPrice * currency.rate);
  };

  const formatPrice = (usdPrice: number): string => {
    const convertedPrice = convertPrice(usdPrice);
    
    // Format based on currency
    if (currency.code === 'INR') {
      // Indian number formatting (lakhs/crores)
      return `${currency.symbol}${convertedPrice.toLocaleString('en-IN')}`;
    } else {
      return `${currency.symbol}${convertedPrice.toLocaleString()}`;
    }
  };

  const changeCurrency = (countryCode: string) => {
    const newCurrency = currencies[countryCode] || currencies.default;
    setCurrency(newCurrency);
  };

  return {
    currency,
    loading,
    convertPrice,
    formatPrice,
    changeCurrency,
    availableCurrencies: currencies
  };
};