import { describe, it, expect } from 'vitest';
import {
  crossCheckForDicom,
  crossCheckForLiquidacion,
  crossCheckForCarpetaTributaria,
} from './crossCheck';

const applicant = {
  applicantName: 'JUAN PEREZ GONZALEZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

describe('crossCheckForDicom', () => {
  it('returns no flags when name and RUT match', () => {
    const flags = crossCheckForDicom(
      { rut: '12345678-5', name: 'JUAN PEREZ GONZALEZ', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags).toHaveLength(0);
  });

  it('returns identity_mismatch when name differs', () => {
    const flags = crossCheckForDicom(
      { rut: '12345678-5', name: 'OTRO NOMBRE', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags.some((f) => f.code === 'identity_mismatch')).toBe(true);
  });

  it('returns identity_mismatch when RUT differs', () => {
    const flags = crossCheckForDicom(
      { rut: '99999999-9', name: 'JUAN PEREZ GONZALEZ', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags.some((f) => f.code === 'identity_mismatch')).toBe(true);
  });
});

describe('crossCheckForLiquidacion', () => {
  it('returns no flags when name, RUT, employer RUT are all valid and well-formed', () => {
    const { crossCheckFlags, employerFormatFlags } = crossCheckForLiquidacion(
      {
        rut: '12345678-5',
        employerRut: '11111111-1',
        employerName: 'EMPRESA',
        grossIncome: 1500000,
        netIncome: 1200000,
        period: '2026-08',
      },
      applicant,
    );
    expect(crossCheckFlags.some((f) => f.code === 'identity_mismatch')).toBe(false);
    expect(employerFormatFlags.some((f) => f.code === 'employer_rut_invalid')).toBe(false);
  });

  it('flags employer_rut_invalid when employer RUT fails mod-11', () => {
    const { employerFormatFlags } = crossCheckForLiquidacion(
      {
        rut: '12345678-5',
        employerRut: '12.345.678-9',
        employerName: 'EMPRESA',
        grossIncome: 1500000,
        netIncome: 1200000,
        period: '2026-08',
      },
      applicant,
    );
    expect(employerFormatFlags.some((f) => f.code === 'employer_rut_invalid')).toBe(true);
  });
});

describe('crossCheckForCarpetaTributaria', () => {
  it('returns no flags when direct name and RUT match', () => {
    const flags = crossCheckForCarpetaTributaria(
      {
        rut: '12345678-5',
        name: 'JUAN PEREZ GONZALEZ',
        fechaEmision: '2026-10-20',
        inicioActividades: '2020-01-01',
        categoriaTributaria: 'Segunda Categoría',
        regimenTributario: null,
        declaracionesF29Count: 12,
      },
      applicant,
    );
    expect(flags.some((f) => f.code === 'identity_mismatch')).toBe(false);
  });

  it('matches when applicant is legal representative in company carpeta tributaria', () => {
    const companyApplicant = {
      applicantName: 'OLGA JOSELYNE QUILILONGO QUINONES',
      applicantRut: '13.563.683-5',
      monthlyRent: 800000,
    };
    const flags = crossCheckForCarpetaTributaria(
      {
        rut: '78093438-7',
        name: 'DONA ISIDORA SPA',
        fechaEmision: '2026-10-27',
        inicioActividades: '2025-01-23',
        categoriaTributaria: 'Primera Categoría',
        regimenTributario: 'PRO PYME',
        declaracionesF29Count: 21,
      },
      companyApplicant,
      'RUT del Emisor: 78093438-7 ... RUT del Representante 13563683-5 OLGA QUILILONGO',
    );
    expect(flags.some((f) => f.code === 'identity_mismatch')).toBe(false);
  });

  it('flags identity_mismatch when neither RUT nor representative matches', () => {
    const flags = crossCheckForCarpetaTributaria(
      {
        rut: '99999999-9',
        name: 'OTRA EMPRESA SPA',
        fechaEmision: '2026-10-20',
        inicioActividades: '2020-01-01',
        categoriaTributaria: 'Primera Categoría',
        regimenTributario: null,
        declaracionesF29Count: 5,
      },
      applicant,
      'Documento sin representante coincidente',
    );
    expect(flags.some((f) => f.code === 'identity_mismatch')).toBe(true);
  });
});
