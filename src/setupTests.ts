import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_PROD_URL', 'https://test.com');

// Mock Firebase (if needed)
vi.mock('@/firebase', () => ({
  default: {},
  auth: {},
  db: {},
  storage: {},
}));
