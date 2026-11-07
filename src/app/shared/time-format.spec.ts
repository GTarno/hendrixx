import { formatClock } from './time-format';

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [4.999, '00:04'],
    [65, '01:05'],
    [600, '10:00'],
    [3725, '1:02:05'],
    [-3, '00:00'],
  ])('%s s → %s', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });
});
