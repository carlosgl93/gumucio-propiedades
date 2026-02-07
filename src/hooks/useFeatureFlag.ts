/**
 * Feature flag hook to control features based on environment
 */

type Environment = 'development' | 'production' | 'test';

const getEnvironment = (): Environment => {
  const env = import.meta.env.VITE_ENV || import.meta.env.MODE;

  // Normalize environment values
  if (env === 'dev' || env === 'development' || env === 'local') {
    return 'development';
  }

  if (env === 'prod' || env === 'production') {
    return 'production';
  }

  return 'development'; // Default to development for safety
};

export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

/**
 * Hook to check if a feature is enabled
 * @param feature - Feature name
 * @returns boolean indicating if feature is enabled
 */
export const useFeatureFlag = (feature: string): boolean => {
  const environment = getEnvironment();

  // Features that are only available in development
  const devOnlyFeatures = [
    'fixtures',
    'debugMode',
    'testData',
  ];

  if (devOnlyFeatures.includes(feature)) {
    return environment === 'development';
  }

  // Default: feature is enabled
  return true;
};
