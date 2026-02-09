/**
 * PDF Configuration
 * Configuration for PDF generation including company branding and contact information
 */

export const PDF_CONFIG = {
  // Company branding
  companyName: import.meta.env.VITE_COMPANY_NAME || 'GUMUCIO PROPIEDADES',
  partners: import.meta.env.VITE_PARTNERS || '',

  // Broker information
  brokerName: import.meta.env.VITE_BROKER_NAME || 'M. de los Angeles Gumucio',
  brokerPhone: import.meta.env.VITE_BROKER_PHONE || '+56 9 9783 0533',

  // Contact information
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || '+505 0000-0000',

  // Footer
  footerCopyright: import.meta.env.VITE_FOOTER_COPYRIGHT || '© 2025 PresenciaInmediata.com',

  // Base URL for property links (used in QR codes)
  baseUrl: import.meta.env.VITE_PROD_URL || 'http://localhost:5173',
};
