import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Figure, valueClass } from './Stat';

describe('a stat value', () => {
  it('is a figure when it holds a number, in any form', () => {
    for (const v of [4, 0, '75%', '3.5 / 5', 'Rs 12,000', '2 min']) {
      expect(valueClass(v)).toBe('dcard__value');
    }
  });

  it('is plain text when it is a word or a dash where a number should be', () => {
    for (const v of ['Not reported', 'Not available', '-', '']) {
      expect(valueClass(v)).toContain('dcard__value--text');
    }
  });

  it('puts that class on the rendered figure, so the tile sizes it as text', () => {
    render(<Figure label="Average response time" value="Not reported" sub="why" />);
    expect(screen.getByText('Not reported').className).toContain('dcard__value--text');
    render(<Figure label="Cancellation rate" value="0%" />);
    expect(screen.getByText('0%').className).toBe('dcard__value');
  });
});
