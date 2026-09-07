import { useGetSettings } from '@workspace/api-client-react';

/**
 * Unified hook for store settings — used across Header, Footer, TopBar, etc.
 * Uses the same React Query cache as the admin settings page so that saving
 * settings in the admin panel immediately updates the storefront without reload.
 */
export function useStoreSettings() {
  const { data: settings, isLoading, isError } = useGetSettings();

  return {
    settings,
    isLoading,
    isError,
    // Convenience accessors with safe fallbacks
    storeName: settings?.storeName ?? 'BOUKHATEM TELECOM',
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    address: settings?.address ?? null,
    facebook: settings?.facebook ?? null,
    instagram: settings?.instagram ?? null,
    whatsapp: settings?.whatsapp ?? null,
    logoUrl: settings?.logoUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? null,
    metaTitle: settings?.metaTitle ?? null,
    metaDescription: settings?.metaDescription ?? null,
  };
}
