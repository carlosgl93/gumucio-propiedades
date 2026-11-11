import type {
  ExtractedDicom,
  ExtractedLiquidacion,
  ExtractedCarpetaTributaria,
  ApplicantContext,
} from '../extractors/types';
import type { Flag } from './types';

function normalize(s: string | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function namesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const cleanB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (cleanA === cleanB) return true;
  const wordsA = cleanA.split(/\s+/).filter(Boolean).sort().join(' ');
  const wordsB = cleanB.split(/\s+/).filter(Boolean).sort().join(' ');
  return wordsA === wordsB;
}

function normalizeRut(s: string | null): string {
  return (s ?? '').replace(/\./g, '').toUpperCase();
}

function rutValid(rut: string): boolean {
  const m = rut.match(/^(\d+)-([\dK])$/i);
  if (!m) return false;
  const num = m[1];
  const dv = m[2].toUpperCase();
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
  return expectedDv === dv;
}

export function crossCheckForDicom(
  extracted: ExtractedDicom,
  applicant: ApplicantContext,
): Flag[] {
  const flags: Flag[] = [];
  const nameMatch = namesMatch(extracted.name, applicant.applicantName);
  const rutMatch = normalizeRut(extracted.rut) === normalizeRut(applicant.applicantRut);

  if (extracted.name !== null && extracted.rut !== null && (!nameMatch || !rutMatch)) {
    flags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `Nombre/RUT del documento (${extracted.name} / ${extracted.rut}) no coincide con el postulante (${applicant.applicantName} / ${applicant.applicantRut})`,
    });
  } else if (extracted.name === null || extracted.rut === null) {
    flags.push({
      code: 'field_missing:identity',
      weight: 0,
      message: 'No se pudo extraer nombre o RUT para cross-check',
    });
  }
  return flags;
}

export function crossCheckForLiquidacion(
  extracted: ExtractedLiquidacion,
  applicant: ApplicantContext,
): { crossCheckFlags: Flag[]; employerFormatFlags: Flag[] } {
  const crossCheckFlags: Flag[] = [];
  const employerFormatFlags: Flag[] = [];

  const rutMatch = normalizeRut(extracted.rut) === normalizeRut(applicant.applicantRut);

  if (extracted.rut !== null && !rutMatch) {
    crossCheckFlags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `RUT del trabajador (${extracted.rut}) no coincide con el postulante (${applicant.applicantRut})`,
    });
  } else if (extracted.rut === null) {
    crossCheckFlags.push({
      code: 'field_missing:rut',
      weight: 0,
      message: 'No se pudo extraer RUT del trabajador',
    });
  }

  if (extracted.employerRut !== null && !rutValid(extracted.employerRut)) {
    employerFormatFlags.push({
      code: 'employer_rut_invalid',
      weight: 10,
      message: `RUT del empleador (${extracted.employerRut}) no pasa validación mod-11`,
    });
  }

  return { crossCheckFlags, employerFormatFlags };
}

export function crossCheckForCarpetaTributaria(
  extracted: ExtractedCarpetaTributaria,
  applicant: ApplicantContext,
  fullText?: string,
): Flag[] {
  const flags: Flag[] = [];
  const normApplicantRut = normalizeRut(applicant.applicantRut);
  const normEmisorRut = normalizeRut(extracted.rut);
  const directRutMatch = normEmisorRut === normApplicantRut;

  // If applicant is individual owner/representative of company, check if applicant RUT appears in document
  const representativeRutMatch = Boolean(
    fullText && normApplicantRut && fullText.replace(/\./g, '').toUpperCase().includes(normApplicantRut),
  );

  const rutMatch = directRutMatch || representativeRutMatch;

  const directNameMatch = namesMatch(extracted.name, applicant.applicantName);
  const nameIncluded = Boolean(
    extracted.name &&
      applicant.applicantName &&
      (normalize(extracted.name).includes(normalize(applicant.applicantName)) ||
        normalize(applicant.applicantName).includes(normalize(extracted.name))),
  );
  const representativeNameMatch = Boolean(
    fullText &&
      applicant.applicantName &&
      normalize(fullText).includes(normalize(applicant.applicantName)),
  );

  const nameMatch = directNameMatch || nameIncluded || representativeNameMatch;

  if (extracted.rut !== null && !rutMatch) {
    flags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `RUT del documento tributario (${extracted.rut}) no coincide con el postulante (${applicant.applicantRut}) ni figura como representante`,
    });
  } else if (!nameMatch && extracted.name !== null && !representativeRutMatch) {
    flags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `Nombre del contribuyente (${extracted.name}) no coincide con el postulante (${applicant.applicantName})`,
    });
  } else if (extracted.rut === null || extracted.name === null) {
    flags.push({
      code: 'field_missing:identity',
      weight: 0,
      message: 'No se pudo extraer emisor o RUT de la carpeta tributaria',
    });
  }

  return flags;
}
