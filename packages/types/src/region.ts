export type SupportedCountry = 'IN' | 'AE' | 'SA';

export type ServiceModel = 'THERAPIST_MARKETPLACE' | 'CLINIC_DIRECTORY';

export interface RegionConfig {
  country: SupportedCountry;
  label: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  stripeCountry: string;
  serviceModel: ServiceModel;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
}

export const REGION_CONFIGS: Record<SupportedCountry, RegionConfig> = {
  IN: {
    country: 'IN',
    label: 'India',
    currency: 'INR',
    currencySymbol: '\u20B9',
    locale: 'en-IN',
    stripeCountry: 'IN',
    serviceModel: 'THERAPIST_MARKETPLACE',
    contactPhone: '+91-XXXXXXXXXX',
    contactEmail: 'support-in@upllyft.com',
    timezone: 'Asia/Kolkata',
  },
  AE: {
    country: 'AE',
    label: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: '\u062F.\u0625',
    locale: 'en-AE',
    stripeCountry: 'AE',
    serviceModel: 'CLINIC_DIRECTORY',
    contactPhone: '+971-XXXXXXXXX',
    contactEmail: 'support-ae@upllyft.com',
    timezone: 'Asia/Dubai',
  },
  SA: {
    country: 'SA',
    label: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: '\u0633.\u0631',
    locale: 'en-SA',
    stripeCountry: 'SA',
    serviceModel: 'CLINIC_DIRECTORY',
    contactPhone: '+966-XXXXXXXXX',
    contactEmail: 'support-sa@upllyft.com',
    timezone: 'Asia/Riyadh',
  },
};

export const SUPPORTED_COUNTRIES: SupportedCountry[] = ['IN', 'AE', 'SA'];

export function getRegionConfig(country: string | null | undefined): RegionConfig | null {
  if (!country) return null;
  return REGION_CONFIGS[country as SupportedCountry] ?? null;
}

export function isSupportedCountry(country: string): country is SupportedCountry {
  return SUPPORTED_COUNTRIES.includes(country as SupportedCountry);
}
