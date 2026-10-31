import { describe, expect, it } from 'vitest';
import { widgetState } from './widget';

describe('widgetState', () => {
  it('отдаёт серию и отметку за сегодня', () => {
    expect(widgetState(true, 5, true, '2026-10-31')).toEqual({ streak: 5, done: true, day: '2026-10-31' });
  });
  it('без входа серия неизвестна', () => {
    expect(widgetState(false, 5, true, '2026-10-31')).toEqual({ streak: -1, done: false, day: '2026-10-31' });
  });
});
