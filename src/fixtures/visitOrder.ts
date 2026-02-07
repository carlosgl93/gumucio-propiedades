/**
 * Test fixtures for Visit Order forms
 * Only used in development environment
 */

export interface VisitOrderFixture {
  visitorName: string;
  visitorRut: string;
  visitorPhone: string;
  visitorEmail: string;
  visitDate: string;
  visitTime: string;
  visitType: 'primera' | 'segunda' | 'tasacion';
}

// Get next Monday's date in YYYY-MM-DD format
const getNextMonday = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days until next Monday
  // If today is Monday (1), we want next Monday (7 days)
  // If today is Tuesday (2), we want 6 days later, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;

  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  return nextMonday.toISOString().split('T')[0];
};

export const visitOrderFixtures: Record<string, VisitOrderFixture> = {
  default: {
    visitorName: 'Carlos Gumucio',
    visitorRut: '18.445.810-1',
    visitorPhone: '+56 9 9392 4214',
    visitorEmail: 'cgumucio93@gmail.com',
    visitDate: getNextMonday(),
    visitTime: '10:00',
    visitType: 'primera',
  },

  secondVisit: {
    visitorName: 'María González',
    visitorRut: '12.345.678-9',
    visitorPhone: '+56 9 8765 4321',
    visitorEmail: 'maria.gonzalez@example.com',
    visitDate: getNextMonday(),
    visitTime: '14:30',
    visitType: 'segunda',
  },

  appraisal: {
    visitorName: 'Juan Pérez',
    visitorRut: '19.876.543-2',
    visitorPhone: '+56 9 1234 5678',
    visitorEmail: 'juan.perez@example.com',
    visitDate: getNextMonday(),
    visitTime: '11:00',
    visitType: 'tasacion',
  },

  saturdayVisit: {
    visitorName: 'Ana Silva',
    visitorRut: '15.234.567-8',
    visitorPhone: '+56 9 5555 6666',
    visitorEmail: 'ana.silva@example.com',
    visitDate: (() => {
      // Get next Saturday
      const date = new Date();
      const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
      date.setDate(date.getDate() + (daysUntilSaturday || 7));
      return date.toISOString().split('T')[0];
    })(),
    visitTime: '11:00',
    visitType: 'primera',
  },
};

/**
 * Get a visit order fixture by name
 * @param fixtureName - Name of the fixture (default: 'default')
 * @returns VisitOrderFixture
 */
export const getVisitOrderFixture = (fixtureName: keyof typeof visitOrderFixtures = 'default'): VisitOrderFixture => {
  return visitOrderFixtures[fixtureName] || visitOrderFixtures.default;
};
