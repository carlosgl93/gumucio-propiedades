import { describe, it, expect } from 'vitest';
import { crossCheckForDicom, crossCheckForLiquidacion } from './crossCheck';

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
    expect(flags.some(f => f.code === 'identity_mismatch')).toBe(true);
  });

  it('returns identity_mismatch when RUT differs', () => {
    const flags = crossCheckForDicom(
      { rut: '99999999-9', name: 'JUAN PEREZ GONZALEZ', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags.some(f => f.code === 'identity_mismatch')).toBe(true);
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
    expect(crossCheckFlags.some(f => f.code === 'identity_mismatch')).toBe(false);
    expect(employerFormatFlags.some(f => f.code === 'employer_rut_invalid')).toBe(false);
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
    expect(employerFormatFlags.some(f => f.code === 'employer_rut_invalid')).toBe(true);
  });
});