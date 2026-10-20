import { logEvent } from 'firebase/analytics';

import { analytics } from '@/firebase';

const canLog = (): boolean => {
  try {
    return Boolean(analytics && (analytics as { app?: { options?: unknown } })?.app?.options);
  } catch {
    return false;
  }
};

export const trackPageView = (path: string, title?: string) => {
  try {
    if (!canLog()) return;
    logEvent(analytics, 'page_view', {
      page_path: path,
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
    });
  } catch (error) {
    console.debug('Analytics page_view error:', error);
  }
};

export interface ContactClickDetails {
  propertyId?: string;
  propertyTitle?: string;
  source?: string;
  value?: number;
  currency?: string;
}

export const trackContactClick = (
  channel: 'whatsapp' | 'phone' | 'email',
  details?: ContactClickDetails,
) => {
  try {
    if (!canLog()) return;

    const source =
      details?.source || (typeof window !== 'undefined' ? window.location.pathname : '');

    // Conversion event standard in GA4 / Google Ads
    logEvent(analytics, 'generate_lead', {
      contact_channel: channel,
      property_id: details?.propertyId || '',
      property_title: details?.propertyTitle || '',
      source_page: source,
      ...(details?.value ? { value: details.value, currency: details.currency || 'CLP' } : {}),
    });

    // Custom event per channel
    logEvent(analytics, `contact_${channel}`, {
      property_id: details?.propertyId || '',
      property_title: details?.propertyTitle || '',
      source_page: source,
    });
  } catch (error) {
    console.debug('Analytics contact error:', error);
  }
};

export interface PropertyViewAnalytics {
  id?: string;
  title?: string;
  type?: string;
  price?: number;
  currency?: string;
  address?: { commune?: string; city?: string };
}

export const trackPropertyView = (property: PropertyViewAnalytics) => {
  try {
    if (!canLog()) return;
    logEvent(analytics, 'view_item', {
      currency: property.currency || 'CLP',
      value: property.price || 0,
      items: [
        {
          item_id: property.id || '',
          item_name: property.title || '',
          item_category: property.type || '',
          price: property.price || 0,
          location_id: property.address?.commune || property.address?.city || '',
        },
      ],
    });
  } catch (error) {
    console.debug('Analytics view_item error:', error);
  }
};

export const trackPropertyShare = (platform: string, propertyId?: string) => {
  try {
    if (!canLog()) return;
    logEvent(analytics, 'share', {
      method: platform,
      content_type: 'property',
      item_id: propertyId || '',
    });
  } catch (error) {
    console.debug('Analytics share error:', error);
  }
};
