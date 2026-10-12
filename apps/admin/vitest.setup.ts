import { configure } from '@testing-library/react';

/**
 * Every async screen holds its skeleton for at least 450ms (a 150ms delay, then
 * a 300ms minimum so it never blinks), and the suite runs ~24 files in parallel.
 * Testing Library's default 1s for `findBy` and `waitFor` is then a coin flip on
 * a busy machine. A passing wait is no slower; only a failing one reports later.
 */
configure({ asyncUtilTimeout: 4000 });
