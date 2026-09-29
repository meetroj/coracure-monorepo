import { DOCTORS, poolFor } from './doctors';

test('the pool for a service holds only that service, soonest-available first', () => {
  const pool = poolFor('Orthopedics');
  expect(pool.length).toBeGreaterThan(0);
  expect(pool.every((d) => d.specialty === 'Orthopedics' || d.services.includes('Orthopedics'))).toBe(true);
  // pool[0] is the assignment, so anyone available now must sort ahead.
  expect(pool.map((d) => d.availableNow)).toEqual([...pool.map((d) => d.availableNow)].sort((a, b) => Number(b) - Number(a)));
});

test('a service with nobody in the catalogue still assigns somebody', () => {
  expect(poolFor('Dietitian')).toHaveLength(DOCTORS.length);
  expect(poolFor(undefined)).toHaveLength(DOCTORS.length);
});
