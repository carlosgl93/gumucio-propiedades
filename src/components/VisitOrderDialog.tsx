import { useState } from 'react';

import { Description } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { jsPDF } from 'jspdf';

import { Property } from '@/models';

interface VisitOrderDialogProps {
  open: boolean;
  property: Property | null;
  onClose: () => void;
}

interface VisitFormData {
  visitorName: string;
  visitorRut: string;
  visitorPhone: string;
  visitorEmail: string;
  visitDate: string;
  visitTime: string;
  visitType: 'primera' | 'segunda' | 'tasacion';
}

// RUT validation
const validateRUT = (rut: string): boolean => {
  // Remove dots and dashes
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
  if (cleanRut.length < 2) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toLowerCase();

  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = 11 - (sum % 11);
  const calculatedDv =
    expectedDv === 11 ? '0' : expectedDv === 10 ? 'k' : expectedDv.toString();

  return dv === calculatedDv;
};

// Format RUT with dots and dash
const formatRUT = (value: string): string => {
  const cleanRut = value.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (cleanRut.length <= 1) return cleanRut;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Add dots every 3 digits from right to left
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${dv}`;
};

// Validate business hours
const isValidBusinessHours = (date: string, time: string): boolean => {
  const visitDate = new Date(`${date}T${time}`);
  const dayOfWeek = visitDate.getDay();
  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  // Sunday (0) not allowed
  if (dayOfWeek === 0) return false;

  // Monday-Friday: 09:00-18:00
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return timeInMinutes >= 9 * 60 && timeInMinutes <= 18 * 60;
  }

  // Saturday: 10:00-14:00
  if (dayOfWeek === 6) {
    return timeInMinutes >= 10 * 60 && timeInMinutes <= 14 * 60;
  }

  return false;
};

// Generate order number (timestamp-based)
const generateOrderNumber = (): string => {
  return `ORD-${Date.now()}`;
};

export const VisitOrderDialog = ({ open, property, onClose }: VisitOrderDialogProps) => {
  const [formData, setFormData] = useState<VisitFormData>({
    visitorName: '',
    visitorRut: '',
    visitorPhone: '',
    visitorEmail: '',
    visitDate: '',
    visitTime: '',
    visitType: 'primera',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (field: keyof VisitFormData, value: string) => {
    let formattedValue = value;

    // Format RUT on the fly
    if (field === 'visitorRut') {
      formattedValue = formatRUT(value);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.visitorName.trim()) {
      newErrors.visitorName = 'Nombre es requerido';
    }

    if (!formData.visitorRut.trim()) {
      newErrors.visitorRut = 'RUT es requerido';
    } else if (!validateRUT(formData.visitorRut)) {
      newErrors.visitorRut = 'RUT inválido';
    }

    if (!formData.visitDate) {
      newErrors.visitDate = 'Fecha es requerida';
    } else {
      const selectedDate = new Date(formData.visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.visitDate = 'La fecha no puede ser anterior a hoy';
      }
    }

    if (!formData.visitTime) {
      newErrors.visitTime = 'Hora es requerida';
    } else if (formData.visitDate) {
      if (!isValidBusinessHours(formData.visitDate, formData.visitTime)) {
        newErrors.visitTime =
          'Horario no permitido. L-V: 09:00-18:00 | Sáb: 10:00-14:00 | Dom: No disponible';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePDF = () => {
    if (!property) return;

    const doc = new jsPDF();
    const orderNumber = generateOrderNumber();
    const emissionDate = new Date().toLocaleDateString('es-CL');
    const visitDateFormatted = new Date(formData.visitDate).toLocaleDateString('es-CL');

    // Set font
    doc.setFont('helvetica');

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

    // Section 2: Property Data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. DATOS DE LA PROPIEDAD', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Propiedad: ${property.title}`, 20, yPosition);
    yPosition += 6;
    doc.text(
      `Dirección: ${property.address.street}, ${property.address.commune}, ${property.address.city}`,
      20,
      yPosition,
    );
    yPosition += 6;
    doc.text(`Tipo: ${property.propertyType}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Código Interno: ${property.id || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Estado: ${property.status}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Precio: ${property.price.toLocaleString()} ${property.currency}`, 20, yPosition);
    yPosition += 10;

    // Section 3: Visitor Data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. DATOS DEL VISITANTE', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre completo: ${formData.visitorName}`, 20, yPosition);
    yPosition += 6;
    doc.text(`RUT: ${formData.visitorRut}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Teléfono: ${formData.visitorPhone || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Email: ${formData.visitorEmail || 'N/A'}`, 20, yPosition);
    yPosition += 10;

    // Section 4: Visit Data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DATOS DE LA VISITA', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de visita: ${visitDateFormatted}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Hora programada: ${formData.visitTime}`, 20, yPosition);
    yPosition += 6;
    doc.text('Duración estimada: 1 hora', 20, yPosition);
    yPosition += 6;

    const visitTypeLabels = {
      primera: 'Primera visita',
      segunda: 'Segunda visita',
      tasacion: 'Tasación',
    };
    doc.text(
      `Tipo de visita: ${visitTypeLabels[formData.visitType]} ☑  ${Object.entries(visitTypeLabels)
        .filter(([key]) => key !== formData.visitType)
        .map(([, label]) => `${label} ☐`)
        .join('  ')}`,
      20,
      yPosition,
    );
    yPosition += 10;

    // Section 5: Terms and Conditions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. TÉRMINOS Y CONDICIONES', 20, yPosition);
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

    // Section 6: Signature
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('6. SECCIÓN DE FIRMA', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Por la presente, declaro haber leído y aceptado las condiciones establecidas.',
      20,
      yPosition,
    );
    yPosition += 15;

    doc.line(20, yPosition, 100, yPosition);
    yPosition += 5;
    doc.text('Firma del Visitante', 20, yPosition);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gumucio Propiedades | Venta y Arriendo de Propiedades en Rancagua', 105, pageHeight - 15, {
      align: 'center',
    });
    doc.text(
      `Contacto: ${property.contactInfo.phone} | ${property.contactInfo.email}`,
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

    // Save PDF
    doc.save(`Orden_Visita_${property.id}_${orderNumber}.pdf`);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      generatePDF();
      // Reset form after successful generation
      setFormData({
        visitorName: '',
        visitorRut: '',
        visitorPhone: '',
        visitorEmail: '',
        visitDate: '',
        visitTime: '',
        visitType: 'primera',
      });
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setFormData({
        visitorName: '',
        visitorRut: '',
        visitorPhone: '',
        visitorEmail: '',
        visitDate: '',
        visitTime: '',
        visitType: 'primera',
      });
      setErrors({});
      onClose();
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generar Orden de Visita</DialogTitle>
      <DialogContent>
        {property && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <strong>Propiedad:</strong> {property.title}
            <br />
            <strong>Dirección:</strong> {property.address.street}, {property.address.commune}
          </Box>
        )}

        <TextField
          fullWidth
          label="Nombre completo del visitante"
          value={formData.visitorName}
          onChange={(e) => handleChange('visitorName', e.target.value)}
          error={!!errors.visitorName}
          helperText={errors.visitorName}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="RUT del visitante"
          value={formData.visitorRut}
          onChange={(e) => handleChange('visitorRut', e.target.value)}
          error={!!errors.visitorRut}
          helperText={errors.visitorRut || 'Formato: 12.345.678-9'}
          margin="normal"
          required
          placeholder="12.345.678-9"
        />

        <TextField
          fullWidth
          label="Teléfono del visitante"
          value={formData.visitorPhone}
          onChange={(e) => handleChange('visitorPhone', e.target.value)}
          margin="normal"
          placeholder="+56 9 1234 5678"
        />

        <TextField
          fullWidth
          label="Email del visitante"
          type="email"
          value={formData.visitorEmail}
          onChange={(e) => handleChange('visitorEmail', e.target.value)}
          margin="normal"
          placeholder="ejemplo@email.com"
        />

        <TextField
          fullWidth
          label="Fecha de visita"
          type="date"
          value={formData.visitDate}
          onChange={(e) => handleChange('visitDate', e.target.value)}
          error={!!errors.visitDate}
          helperText={errors.visitDate}
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: today }}
        />

        <TextField
          fullWidth
          label="Hora de visita"
          type="time"
          value={formData.visitTime}
          onChange={(e) => handleChange('visitTime', e.target.value)}
          error={!!errors.visitTime}
          helperText={errors.visitTime || 'L-V: 09:00-18:00 | Sáb: 10:00-14:00'}
          margin="normal"
          required
          InputLabelProps={{ shrink: true }}
        />

        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">Tipo de visita</FormLabel>
          <RadioGroup
            row
            value={formData.visitType}
            onChange={(e) => handleChange('visitType', e.target.value)}
          >
            <FormControlLabel value="primera" control={<Radio />} label="Primera visita" />
            <FormControlLabel value="segunda" control={<Radio />} label="Segunda visita" />
            <FormControlLabel value="tasacion" control={<Radio />} label="Tasación" />
          </RadioGroup>
        </FormControl>

        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Por favor corrige los errores antes de continuar
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isGenerating}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isGenerating}
          startIcon={<Description />}
        >
          {isGenerating ? 'Generando...' : 'Generar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
