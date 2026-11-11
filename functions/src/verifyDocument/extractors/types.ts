export type DocType = 'dicom' | 'liquidacion' | 'carpeta_tributaria';

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

export interface ExtractedCarpetaTributaria {
  rut: string | null;
  name: string | null;
  fechaEmision: string | null;
  inicioActividades: string | null;
  categoriaTributaria: string | null;
  regimenTributario: string | null;
  declaracionesF29Count: number;
}

export interface ApplicantContext {
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
}
