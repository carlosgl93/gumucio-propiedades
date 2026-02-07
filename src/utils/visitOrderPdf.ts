import { jsPDF } from 'jspdf';

import { Property } from '@/models';

interface VisitOrderData {
  visitorName: string;
  visitorRut: string;
  visitorPhone: string;
  visitorEmail: string;
  visitDate: string;
  visitTime: string;
  visitType: 'primera' | 'segunda' | 'tasacion';
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
 * Generate a unique order number based on timestamp
 */
const generateOrderNumber = (): string => {
  return `ORD-${Date.now()}`;
};

/**
 * Generate a PDF for a property visit order
 * @param property - The property for the visit
 * @param visitData - The visitor and visit information
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export const generateVisitOrderPDF = async (
  property: Property,
  visitData: VisitOrderData,
): Promise<void> => {
  const doc = new jsPDF();
  const orderNumber = generateOrderNumber();
  const emissionDate = formatDate(new Date().toISOString());
  const visitDateFormatted = formatDate(visitData.visitDate);

  // Set font
  doc.setFont('helvetica');

  // Add logo to top right corner (square aspect ratio)
  try {
    const logoImg = new Image();
    logoImg.src = '/propiedades-gumucio-logo.png';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });
    // Add logo at top right with square aspect ratio (20x20mm)
    doc.addImage(logoImg, 'PNG', 170, 10, 20, 20);
  } catch (error) {
    console.warn('Could not load logo:', error);
  }

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GUMUCIO PROPIEDADES', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Orden de Visita a Propiedad', 105, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${orderNumber}`, 105, 35, { align: 'center' });
  doc.text(`Fecha de emisión: ${emissionDate}`, 105, 40, { align: 'center' });

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);

  let yPosition = 55;

  // Section: Property Data
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA PROPIEDAD', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Propiedad: ${property.title || 'N/A'}`, 20, yPosition);
  yPosition += 6;

  const street = property.address?.street || 'N/A';
  const commune = property.address?.commune || 'N/A';
  const city = property.address?.city || 'N/A';
  doc.text(
    `Dirección: ${street}, ${commune}, ${city}`,
    20,
    yPosition,
  );
  yPosition += 6;
  doc.text(`Tipo: ${property.propertyType || 'N/A'}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Código Interno: ${property.id || 'N/A'}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Estado: ${property.status || 'N/A'}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Precio: ${property.price?.toLocaleString() || 'N/A'} ${property.currency || ''}`, 20, yPosition);
  yPosition += 10;

  // Section: Visitor Data
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VISITANTE', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre completo: ${visitData.visitorName}`, 20, yPosition);
  yPosition += 6;
  doc.text(`RUT: ${visitData.visitorRut}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Teléfono: ${visitData.visitorPhone || 'N/A'}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Email: ${visitData.visitorEmail || 'N/A'}`, 20, yPosition);
  yPosition += 10;

  // Section: Visit Data
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA VISITA', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de visita: ${visitDateFormatted}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Hora programada: ${visitData.visitTime}`, 20, yPosition);
  yPosition += 6;
  doc.text('Duración estimada: 1 hora', 20, yPosition);
  yPosition += 6;

  const visitTypeLabels = {
    primera: 'Primera visita',
    segunda: 'Segunda visita',
    tasacion: 'Tasación',
  };
  doc.text(`Tipo de visita: ${visitTypeLabels[visitData.visitType]}`, 20, yPosition);
  yPosition += 10;

  // Section: Terms and Conditions
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TÉRMINOS Y CONDICIONES', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const terms = [
    'El visitante declara que asiste voluntariamente a la visita de la propiedad antes señalada.',
    'El visitante se compromete a cuidar y respetar la propiedad durante su recorrido.',
    'La presente orden de visita es válida únicamente para la fecha y hora indicada.',
    'El visitante autoriza a Gumucio Propiedades a contactarlo para seguimiento comercial.',
    'Queda prohibido el ingreso con mascotas, alimentos o bebidas a la propiedad.',
    'El visitante debe presentar su cédula de identidad al momento de la visita.',
    'Esta orden es personal e intransferible.',
    'Horarios permitidos: Lunes a Viernes 09:00 a 18:00 hrs | Sábados 10:00 a 14:00 hrs',
  ];

  terms.forEach((term, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${term}`, 170);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * 5;
  });

  yPosition += 5;

  // Section: Signature (centered)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SECCIÓN DE FIRMA', 105, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Por la presente, declaro haber leído y aceptado las condiciones establecidas.',
    105,
    yPosition,
    { align: 'center' },
  );
  yPosition += 15;

  // Signature line centered
  const signatureLineStart = 70;
  const signatureLineEnd = 140;
  doc.line(signatureLineStart, yPosition, signatureLineEnd, yPosition);
  yPosition += 5;
  doc.text('Firma del Visitante', 105, yPosition, { align: 'center' });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Gumucio Propiedades | Venta y Arriendo de Propiedades en Rancagua',
    105,
    pageHeight - 15,
    {
      align: 'center',
    },
  );
  const contactPhone = property.contactInfo?.phone || 'N/A';
  const contactEmail = property.contactInfo?.email || 'N/A';
  doc.text(
    `Contacto: ${contactPhone} | ${contactEmail}`,
    105,
    pageHeight - 10,
    { align: 'center' },
  );
  doc.text(
    'Este documento tiene validez legal como autorización de ingreso a la propiedad.',
    105,
    pageHeight - 5,
    { align: 'center' },
  );

  // Save PDF with format: OV_{address}_{date}.pdf
  const addressForFilename = sanitizeFilename(property.address?.street || 'Propiedad');
  // Convert YYYY-MM-DD to DDMMYYYY for filename
  const dateForFilename = formatDate(visitData.visitDate).replace(/-/g, ''); // DDMMYYYY format

  doc.save(`OV_${addressForFilename}_${dateForFilename}.pdf`);
};
