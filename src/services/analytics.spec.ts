import * as firebaseAnalytics from 'firebase/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  trackContactClick,
  trackPageView,
  trackPropertyShare,
  trackPropertyView,
} from './analytics';

vi.mock('firebase/analytics', () => ({
  logEvent: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  analytics: { app: { options: { measurementId: 'G-TEST' } } },
}));

describe('analytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks page views correctly', () => {
    trackPageView('/propiedades', 'Propiedades en Venta');
    expect(firebaseAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'page_view', {
      page_path: '/propiedades',
      page_title: 'Propiedades en Venta',
    });
  });

  it('tracks contact clicks with generate_lead and contact channel event', () => {
    trackContactClick('whatsapp', {
      propertyId: 'prop-123',
      propertyTitle: 'Casa Machali',
      source: '/property/prop-123',
    });

    expect(firebaseAnalytics.logEvent).toHaveBeenCalledTimes(2);
    expect(firebaseAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'generate_lead', {
      contact_channel: 'whatsapp',
      property_id: 'prop-123',
      property_title: 'Casa Machali',
      source_page: '/property/prop-123',
    });
    expect(firebaseAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'contact_whatsapp', {
      property_id: 'prop-123',
      property_title: 'Casa Machali',
      source_page: '/property/prop-123',
    });
  });

  it('tracks property view as view_item', () => {
    trackPropertyView({
      id: 'prop-456',
      title: 'Depto Rancagua',
      type: 'rent',
      price: 450000,
      currency: 'CLP',
      address: { commune: 'Rancagua', city: 'Rancagua' },
    });

    expect(firebaseAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'view_item', {
      currency: 'CLP',
      value: 450000,
      items: [
        {
          item_id: 'prop-456',
          item_name: 'Depto Rancagua',
          item_category: 'rent',
          price: 450000,
          location_id: 'Rancagua',
        },
      ],
    });
  });

  it('tracks property share events', () => {
    trackPropertyShare('whatsapp', 'prop-789');
    expect(firebaseAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'share', {
      method: 'whatsapp',
      content_type: 'property',
      item_id: 'prop-789',
    });
  });
});
