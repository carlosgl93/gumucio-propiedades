import type { ApplicantContext } from '../extractors/types';

export type Verdict = 'pass' | 'warn' | 'fail';

export interface Flag {
  code: string;
  weight: number; // 0..max for this check
  message: string;
}

export interface LlmEvaluation {
  score: number; // 0..15
  flags: string[];
  confidence: number; // 0..1
}

export interface VerificationResult {
  score: number;
  verdict: Verdict;
  flags: Flag[];
  extractedFields: Record<string, unknown>;
  llmUnavailable: boolean;
}

export interface ScoreInput {
  extracted: Record<string, unknown>;
  ela: { global: number; maxCell: number };
  crossCheckFlags: Flag[];
  employerFormatFlags: Flag[];
  llm: LlmEvaluation | null;
  monthlyRent: number;
  applicant: ApplicantContext;
}