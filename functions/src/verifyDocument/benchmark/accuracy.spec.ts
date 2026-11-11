// functions/src/verifyDocument/benchmark/accuracy.spec.ts
import { describe, it, expect } from 'vitest';
import { score } from '../rules/score';
import {
  crossCheckForDicom,
  crossCheckForLiquidacion,
  crossCheckForCarpetaTributaria,
} from '../rules/crossCheck';
import { extract } from '../extractors';
import type {
  ApplicantContext,
  ExtractedDicom,
  ExtractedLiquidacion,
  ExtractedCarpetaTributaria,
  DocType,
} from '../extractors/types';

interface BenchmarkCase {
  id: string;
  category: 'authentic' | 'counterfeit_identity' | 'counterfeit_rut' | 'counterfeit_tampered';
  expectedVerdict: 'pass' | 'warn' | 'fail';
  rawText: string;
  docType: DocType;
  applicant: ApplicantContext;
  ela: { global: number; maxCell: number };
  llm: { score: number; flags: string[]; confidence: number } | null;
}

const benchmarkDataset: BenchmarkCase[] = [
  // 1. Legítimo perfecto DICOM (RUT 15.345.678-K válido mod-11)
  {
    id: 'LEGIT-01-DICOM',
    category: 'authentic',
    expectedVerdict: 'pass',
    docType: 'dicom',
    applicant: { applicantName: 'JUAN PEREZ GONZALEZ', applicantRut: '15.345.678-K', monthlyRent: 400000 },
    rawText: `INFORME COMERCIAL CONSOLIDADO
RUT: 15345678-K
Nombre: JUAN PEREZ GONZALEZ
Fecha: 10/10/2026
Resumen de Protestos: 0`,
    ela: { global: 0.06, maxCell: 0.10 },
    llm: { score: 15, flags: [], confidence: 0.98 },
  },
  // 2. Legítimo Liquidación con logo JPEG comprimido (tolera maxCell ~0.22)
  {
    id: 'LEGIT-02-LIQUIDACION',
    category: 'authentic',
    expectedVerdict: 'pass',
    docType: 'liquidacion',
    applicant: { applicantName: 'MARIA SILVA ROJAS', applicantRut: '17.323.127-K', monthlyRent: 350000 },
    rawText: `LIQUIDACION DE SUELDO
Empresa: INVERSIONES NORTE SPA
RUT Empresa: 76.123.456-7
Trabajador: MARIA SILVA ROJAS
RUT: 17323127-K
Total Haberes: 1.500.000
Total Descuentos: 300.000
Liquido a pagar: 1.200.000`,
    ela: { global: 0.08, maxCell: 0.22 },
    llm: { score: 14, flags: [], confidence: 0.92 },
  },
  // 3. Legítimo Carpeta Tributaria SII
  {
    id: 'LEGIT-03-CARPETA-TRIBUTARIA',
    category: 'authentic',
    expectedVerdict: 'pass',
    docType: 'carpeta_tributaria',
    applicant: { applicantName: 'DOÑA ISIDORA SPA', applicantRut: '78.093.438-7', monthlyRent: 800000 },
    rawText: `CARPETA TRIBUTARIA REGULAR
Nombre del Emisor: DOÑA ISIDORA SPA
RUT del Emisor: 78093438-7
Fecha de generación de la Carpeta: 27/10/2026 11:13
Categoría Tributaria: Primera Categoría
Declaración Mensual y Pago Simultáneo de Impuestos`,
    ela: { global: 0.06, maxCell: 0.11 },
    llm: { score: 15, flags: [], confidence: 0.95 },
  },
  // 4. Fraude: RUT en documento pertenece a otra persona (suplantación)
  {
    id: 'FRAUD-01-IDENTITY-MISMATCH',
    category: 'counterfeit_identity',
    expectedVerdict: 'fail',
    docType: 'dicom',
    applicant: { applicantName: 'PEDRO SOTO', applicantRut: '18.999.888-1', monthlyRent: 500000 },
    rawText: `INFORME COMERCIAL CONSOLIDADO
RUT: 15345678-K
Nombre: JUAN PEREZ GONZALEZ
Fecha: 10/10/2026
Resumen de Protestos: 0`,
    ela: { global: 0.05, maxCell: 0.09 },
    llm: { score: 15, flags: [], confidence: 0.95 },
  },
  // 5. Fraude: RUT inventado con dígito verificador inválido
  {
    id: 'FRAUD-02-INVALID-RUT',
    category: 'counterfeit_rut',
    expectedVerdict: 'fail',
    docType: 'dicom',
    applicant: { applicantName: 'CARLOS LOPEZ', applicantRut: '12345678-9', monthlyRent: 400000 },
    rawText: `INFORME COMERCIAL
RUT: 12345678-9
Nombre: CARLOS LOPEZ
Fecha: 01/01/2026
Resumen de Protestos: 0`,
    ela: { global: 0.05, maxCell: 0.10 },
    llm: { score: 12, flags: ['rut_checksum_invalid'], confidence: 0.9 },
  },
  // 6. Fraude: Adulteración visual por parche/Photoshop (ELA disparado)
  {
    id: 'FRAUD-03-TAMPERED-ELA',
    category: 'counterfeit_tampered',
    expectedVerdict: 'fail',
    docType: 'liquidacion',
    applicant: { applicantName: 'ANDRES MORALES', applicantRut: '17.323.127-K', monthlyRent: 600000 },
    rawText: `LIQUIDACION DE SUELDO
Empresa: SERVICIOS Y LOGISTICA LTDA
RUT Empresa: 76.123.456-7
Trabajador: ANDRES MORALES
RUT: 17323127-K
Total Haberes: 2.800.000
Liquido a pagar: 2.500.000`,
    ela: { global: 0.22, maxCell: 0.65 }, // Parche detectado en ELA
    llm: { score: 3, flags: ['font_mismatch', 'visual_tampering'], confidence: 0.95 },
  },
];

describe('Pipeline Accuracy & Confusion Matrix Benchmark', () => {
  it('correctly classifies authentic vs counterfeit documents with zero false negatives', () => {
    let tp = 0; // True Positive: Fraude detectado (fail/warn)
    let tn = 0; // True Negative: Legítimo aprobado (pass)
    let fp = 0; // False Positive: Legítimo rechazado
    let fn = 0; // False Negative: Fraude no detectado (CRÍTICO)

    for (const testCase of benchmarkDataset) {
      const extractedRaw = extract(testCase.rawText, testCase.docType);
      const crossResult =
        testCase.docType === 'dicom'
          ? {
              crossCheckFlags: crossCheckForDicom(
                extractedRaw as ExtractedDicom,
                testCase.applicant,
              ),
              employerFormatFlags: [],
            }
          : testCase.docType === 'carpeta_tributaria'
            ? {
                crossCheckFlags: crossCheckForCarpetaTributaria(
                  extractedRaw as ExtractedCarpetaTributaria,
                  testCase.applicant,
                  testCase.rawText,
                ),
                employerFormatFlags: [],
              }
            : crossCheckForLiquidacion(
                extractedRaw as ExtractedLiquidacion,
                testCase.applicant,
              );

      const res = score({
        extracted: { type: testCase.docType, ...extractedRaw },
        ela: testCase.ela,
        crossCheckFlags: crossResult.crossCheckFlags,
        employerFormatFlags: crossResult.employerFormatFlags,
        llm: testCase.llm,
        monthlyRent: testCase.applicant.monthlyRent,
        applicant: testCase.applicant,
      });

      const isFraud = testCase.category !== 'authentic';
      const flaggedAsSuspicious = res.verdict === 'fail' || res.verdict === 'warn';

      if (isFraud && flaggedAsSuspicious) tp++;
      else if (!isFraud && !flaggedAsSuspicious) tn++;
      else if (!isFraud && flaggedAsSuspicious) fp++;
      else if (isFraud && !flaggedAsSuspicious) fn++;

      expect(res.verdict).toBe(testCase.expectedVerdict);
    }

    const total = benchmarkDataset.length;
    const accuracy = ((tp + tn) / total) * 100;
    const recall = (tp / (tp + fn)) * 100;

    console.log('\n========================================');
    console.log('       CONFUSION MATRIX BENCHMARK       ');
    console.log('========================================');
    console.log(`Total casos evaluados: ${total}`);
    console.log(`True Positives (Fraudes detectados):     ${tp}`);
    console.log(`True Negatives (Legítimos aprobados):    ${tn}`);
    console.log(`False Positives (Falsos rechazos):       ${fp}`);
    console.log(`False Negatives (Fraudes pasados - FNR): ${fn}`);
    console.log('----------------------------------------');
    console.log(`Accuracy global:                         ${accuracy.toFixed(1)}%`);
    console.log(`Recall (Sensibilidad a fraude):          ${recall.toFixed(1)}%`);
    console.log('========================================\n');

    expect(fn).toBe(0); // 0 tolerancia a falsos negativos
  });
});
