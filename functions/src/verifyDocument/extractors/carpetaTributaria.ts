import type { ExtractedCarpetaTributaria } from './types';
import { isValidRut } from './rut';

export function extractCarpetaTributaria(text: string): ExtractedCarpetaTributaria {
  let rut: string | null = null;
  const rutMatch = text.match(/RUT\s+del\s+Emisor[:\s]+([0-9kK.-]+)/i);
  if (rutMatch) {
    const raw = rutMatch[1].replace(/\./g, '').toUpperCase();
    const parts = raw.match(/^(\d+)-?([\dK])$/i);
    if (parts && isValidRut(parts[1], parts[2])) {
      rut = `${parts[1]}-${parts[2]}`;
    }
  }

  const nameMatch = text.match(/Nombre\s+del\s+Emisor[:\s]+([^\n]+)/i);
  const name = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : null;

  const fechaMatch = text.match(
    /Fecha\s+de\s+generaci[oó]n\s+de\s+la\s+Carpeta[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  );
  let fechaEmision: string | null = null;
  if (fechaMatch) {
    const slash = fechaMatch[1].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    fechaEmision = slash ? `${slash[3]}-${slash[2]}-${slash[1]}` : null;
  }

  const inicioMatch = text.match(
    /Fecha\s+de\s+Inicio\s+de\s+Actividades[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  );
  let inicioActividades: string | null = null;
  if (inicioMatch) {
    const slash = inicioMatch[1].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    inicioActividades = slash ? `${slash[3]}-${slash[2]}-${slash[1]}` : null;
  }

  const catMatch = text.match(/Categor[íi]a\s+Tributaria:\s*([^\n]+)/i);
  const categoriaTributaria = catMatch ? catMatch[1].replace(/\s+/g, ' ').trim() : null;

  const regMatch = text.match(/R[ée]gimen\s+Tributario[:\s]+([^\n]+)/i);
  const regimenTributario = regMatch ? regMatch[1].replace(/\s+/g, ' ').trim() : null;

  const f29Matches = text.match(/Declaraci[oó]n\s+Mensual\s+y\s+Pago/gi) || [];
  const declaracionesF29Count = f29Matches.length;

  return {
    rut,
    name,
    fechaEmision,
    inicioActividades,
    categoriaTributaria,
    regimenTributario,
    declaracionesF29Count,
  };
}
