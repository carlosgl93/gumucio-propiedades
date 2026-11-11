// src/models/application.ts
import type { Timestamp } from 'firebase/firestore';

export type DocType = 'dicom' | 'liquidacion' | 'carpeta_tributaria';
export type Verdict = 'pass' | 'warn' | 'fail';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_more_docs';

export interface VerificationResult {
  score: number;
  verdict: Verdict;
  flags: { code: string; weight: number; message: string }[];
  extractedFields: Record<string, unknown>;
  llmUnavailable: boolean;
}

export interface Documento {
  id: string;
  type: DocType;
  fileUrl: string;
  score: number;
  verdict: Verdict;
  flags: { code: string; weight: number; message: string }[];
  extractedFields: Record<string, unknown>;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface Postulacion {
  id: string;
  propertyId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
  status: ApplicationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  documentos?: Documento[];
}
