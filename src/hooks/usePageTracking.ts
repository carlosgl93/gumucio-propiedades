import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { trackPageView } from '@/services/analytics';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
};
