import { isValidE164, toE164 } from './auth';

/**
 * The E.164 rule, checked locally so a malformed number never costs a round
 * trip — and so the local rule can never drift from the server's, which is
 * `/^\+[1-9]\d{7,14}$/` in `src/identity/dto/auth.dto.ts`.
 */
describe('E.164', () => {
  it.each([
    ['+919876543210', true],
    ['+14155550123', true],
    ['+442071838750', true],
    ['+65 8123 4567'.replace(/\s/g, ''), true],
  ])('accepts %s', (value, expected) => {
    expect(isValidE164(value)).toBe(expected);
  });

  it.each([
    ['9876543210', 'no plus'],
    ['+09876543210', 'leading zero after the plus'],
    ['+9198765', 'too short'],
    ['+9198765432109876', 'too long'],
    ['+91987654321a', 'not all digits'],
    ['', 'empty'],
  ])('rejects %s (%s)', (value) => {
    expect(isValidE164(value)).toBe(false);
  });

  it('joins a dial code and national digits, stripping formatting', () => {
    expect(toE164('+91', '98765 43210')).toBe('+919876543210');
    expect(toE164('+91', '98765-43210')).toBe('+919876543210');
    expect(isValidE164(toE164('+91', '9876543210'))).toBe(true);
  });
});
