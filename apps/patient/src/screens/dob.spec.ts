import { daysInMonth } from './ProfileSetupScreen';

// The DOB sheet clamps the day column with this; February and leap years are
// the only way it can be wrong.
test('daysInMonth covers month lengths and leap years', () => {
  expect(daysInMonth(1, 1992)).toBe(31);
  expect(daysInMonth(2, 1992)).toBe(29);
  expect(daysInMonth(2, 1993)).toBe(28);
  expect(daysInMonth(2, 1900)).toBe(28);
  expect(daysInMonth(4, 2026)).toBe(30);
  expect(daysInMonth(12, 2026)).toBe(31);
});
