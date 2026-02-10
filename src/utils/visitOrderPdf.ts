import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

import { PDF_CONFIG } from '@/config/pdfConfig';
import { Property } from '@/models';

import { formatPriceWithConversion } from './currencyConverter';

interface VisitOrderData {
  visitorName: string;
}

/**
 * Sanitize text for use in filenames
 * Removes accents, special characters, and replaces spaces with underscores
 */
const sanitizeFilename = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
};

/**
 * Format date as DD-MM-YYYY
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Add days to a date
 */
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get property type label in Spanish
 */
const getPropertyTypeLabel = (property: Property): string => {
  const typeMap: Record<string, string> = {
    casa: 'Casa',
    departamento: 'Departamento',
    oficina: 'Oficina',
    terreno: 'Terreno',
    comercial: 'Local Comercial',
  };

  const transactionType = property.type === 'sale' ? 'Venta' : 'Arriendo';
  const propertyType = typeMap[property.propertyType || ''] || 'Propiedad';

  return `${transactionType} en ${propertyType}`;
};

/**
 * Generate a PDF for a property visit order
 * @param property - The property for the visit
 * @param visitData - The visitor information
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export const generateVisitOrderPDF = async (
  property: Property,
  visitData: VisitOrderData,
): Promise<void> => {
  const doc = new jsPDF();
  const currentDate = new Date();
  const emissionDate = formatDate(currentDate.toISOString());
  const maxVisitDate = formatDate(addDays(currentDate, 7).toISOString());

  // Set font
  doc.setFont('helvetica');

  // ========================================
  // HEADER SECTION
  // ========================================

  // Add logo to top right corner (4:3 aspect ratio)
  try {
    const logoImg = new Image();
    logoImg.src = '/propiedades-gumucio-logo.png';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });
    // Add logo at top right with 4:3 aspect ratio (20x15mm)
    doc.addImage(logoImg, 'PNG', 170, 10, 20, 15);
  } catch (error) {
    console.warn('Could not load logo:', error);
  }

  // Top-right: Dates (positioned below logo)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitida: ${emissionDate}`, 190, 28, { align: 'right' });
  doc.text(`Plazo máximo para la visita: ${maxVisitDate}`, 190, 33, { align: 'right' });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Orden de Visita', 105, 20, { align: 'center' });

  // Line separator (positioned below dates with spacing)
  doc.setLineWidth(0.3);
  doc.line(20, 42, 190, 42);

  // ========================================
  // INFO ROW (Cliente, Propiedad, Fecha)
  // ========================================

  let yPos = 50;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(visitData.visitorName, 38, yPos);

  // Propiedad (use property ID as MLS)
  doc.setFont('helvetica', 'bold');
  doc.text('Propiedad:', 90, yPos);
  doc.setFont('helvetica', 'normal');
  const propertyId = property.id ? property.id.substring(0, 10) : 'N/A';
  doc.text(`MLS${propertyId}`, 110, yPos);

  yPos += 8;

  // ========================================
  // MAIN CONTENT SECTION (3-column layout)
  // ========================================

  // Property Type Label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(getPropertyTypeLabel(property), 20, yPos);
  yPos += 5;

  // Property Address
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const fullAddress =
    `${property.address?.street || ''}, ${property.address?.commune || ''}, ${property.address?.city || ''}`.trim();
  const addressLines = doc.splitTextToSize(fullAddress, 90);
  doc.text(addressLines, 20, yPos);
  yPos += 10;

  // Save Y position for details
  const contentStartY = yPos;

  // Property Details (full width)
  let detailsY = contentStartY;
  const detailsX = 20;

  // Price with conversion
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Precio:', detailsX, detailsY);
  detailsY += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Format price with conversion to UF
  const priceText = await formatPriceWithConversion(
    property.price || 0,
    property.currency || 'USD',
    'UF', // Convert to UF
  );
  const priceLines = doc.splitTextToSize(priceText, 130);
  doc.text(priceLines, detailsX, detailsY);
  detailsY += priceLines.length * 4 + 3;

  // Características (Features)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Características:', detailsX, detailsY);
  detailsY += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Bedrooms
  if (property.features?.bedrooms !== undefined) {
    doc.text(`Habitaciones: ${property.features.bedrooms}`, detailsX + 2, detailsY);
    detailsY += 4;
  }

  // Bathrooms
  if (property.features?.bathrooms !== undefined) {
    doc.text(`Baños: ${property.features.bathrooms}`, detailsX + 2, detailsY);
    detailsY += 4;
  }

  // Built area (superficie útil)
  if (property.features?.builtArea !== undefined) {
    doc.text(`Superficie útil: ${property.features.builtArea} m²`, detailsX + 2, detailsY);
    detailsY += 4;
  }

  // Total area (superficie total)
  if (property.features?.totalArea !== undefined) {
    doc.text(`Superficie total: ${property.features.totalArea} m²`, detailsX + 2, detailsY);
    detailsY += 4;
  }

  detailsY += 2;

  // Amenities (show property's amenities)
  if (property.amenities && property.amenities.length > 0) {
    // Limit to first 8 amenities to fit in space
    const displayAmenities = property.amenities.slice(0, 8);

    displayAmenities.forEach((amenity) => {
      doc.text(`x  ${amenity}`, detailsX + 2, detailsY);
      detailsY += 4;
    });
  }

  // QR Code (right side)
  try {
    const propertyUrl = `${PDF_CONFIG.baseUrl}/property/${property.id}`;
    const qrDataUrl = await QRCode.toDataURL(propertyUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Add QR code: x=155, y=contentStartY, 25x25mm
    doc.addImage(qrDataUrl, 'PNG', 155, contentStartY, 25, 25);

    // Label below QR
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Escanea para ver', 167, contentStartY + 27, { align: 'center' });
    doc.text('la propiedad', 167, contentStartY + 30, { align: 'center' });
  } catch (error) {
    console.warn('Could not generate QR code:', error);
  }

  // ========================================
  // LEGAL TEXT SECTION
  // ========================================

  yPos = contentStartY + 50; // Position after image/details section

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // Legal text
  const legalText = `De interesarme en esta propiedad, me obligo a encargar a la corredora individualizada al pie de firma (la "Corredora") la realización de los trámites pertinentes ante el propietario, para comprarla o arrendarla. Declaro que la Corredora es la primera en ofrecérmela y cualquier gestión la realizaré por su intermedio. Por consiguiente, me obligo a pagar a la Corredora una comisión de: (a) 2% del valor de compra más IVA en caso de adquirir la propiedad, debiendo pagarle a la fecha de firma de la escritura de compraventa, o bien, (b) el 50% de una renta mensual de arriendo más IVA, debiendo pagarle a la fecha de firma del contrato de arriendo. Si directa o indirectamente compro o arriendo la propiedad prescindiendo de la intermediación de la Corredora, pagaré a ésta -como multa- el doble de la comisión establecida en el párrafo anterior. Declaro, bajo juramento, que solicito y recibo esta orden de visita para mí, mi cónyuge y/o para la persona a quien señalo en el encabezamiento, y que cuento con su autorización para representarla. MercadoLibre Chile Ltda. y sus sociedades relacionadas no son dueños de las propiedades ofrecidas y no verifica los antecedentes (jurídicos, técnicos, metrajes, etc.) de las propiedades, por lo que se recomienda a los interesados los haga estudiar por profesionales de su confianza. Cualquier dificultad que pueda surgir entre el interesado y la Corredora con motivo de esta orden de visita será resuelta por un árbitro a ser designado por la Corredora, el que deberá tener el título de abogado y ser especialista en derecho inmobiliario con a lo menos 5 años de experiencia en el ejercicio de la profesión. El árbitro actuará como arbitrador y amigable componedor en única instancia y contra cuyo fallo no procederá recurso alguno.`;

  const legalLines = doc.splitTextToSize(legalText, 170);
  doc.text(legalLines, 20, yPos);
  yPos += legalLines.length * 3 + 10;

  // ========================================
  // SIGNATURE SECTION
  // ========================================

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Firma del Corredor (left)
  const signatureLeftX = 50;
  const signatureRightX = 150;

  // Left signature
  doc.line(30, yPos, 70, yPos); // signature line
  doc.text('Firma del Corredor', signatureLeftX, yPos + 5, { align: 'center' });

  // Right signature
  doc.line(130, yPos, 170, yPos); // signature line
  doc.text('Firma del Visitante', signatureRightX, yPos + 5, { align: 'center' });

  // ========================================
  // FOOTER
  // ========================================

  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Broker information
  const brokerInfo = `${PDF_CONFIG.brokerName} | ${PDF_CONFIG.brokerPhone}`;
  doc.text(brokerInfo, 105, pageHeight - 10, { align: 'center' });

  // Page number
  doc.setFontSize(7);
  doc.text('Página | nro 1', 190, pageHeight - 10, { align: 'right' });

  // ========================================
  // SAVE PDF
  // ========================================

  const addressForFilename = sanitizeFilename(property.address?.street || 'Propiedad');
  const dateForFilename = formatDate(new Date().toISOString()).replace(/-/g, '');

  doc.save(`OrdenVisita_${addressForFilename}_${dateForFilename}.pdf`);
};
