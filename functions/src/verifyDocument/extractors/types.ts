export type DocType = 'dicom' | 'liquidacion';

export interface ExtractedDicom {
  rut: string | null;
  name: string | null;
  fechaEmision: string | null;
  plazoHistorico: string | null;
  protestos: number | null;
}

export interface ExtractedLiquidacion {
  rut: string | null;
  employerRut: string | null;
  employerName: string | null;
  grossIncome: number | null;
  netIncome: number | null;
  period: string | null;
}

export interface ApplicantContext {
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
}
