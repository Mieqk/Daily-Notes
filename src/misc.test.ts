import { describe, expect, it } from 'vitest';
import { plural } from './plural';
import { QUESTIONS, questionIndex, questionText } from './lib/questions';
import { generateUUID } from './lib/uuid';
import type { Lang } from './i18n';

describe('plural', () => {
  it('русские формы', () => {
    const f = (n: number) => plural('ru', n, 'day');
    expect([1, 2, 5, 11, 12, 21, 22, 25, 101, 111].map(f)).toEqual(['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'день', 'дней']);
  });
  it('английские и прочие', () => {
    expect(plural('en', 1, 'word')).toBe('word');
    expect(plural('en', 2, 'word')).toBe('words');
    expect(plural('de', 0, 'day')).toBe('Tage');
  });
  it('неизвестный язык — английский', () => {
    expect(plural('xx' as Lang, 2, 'char')).toBe('chars');
  });
});

describe('вопрос дня', () => {
  it('во всех языках одинаковое число вопросов', () => {
    const n = QUESTIONS.ru.length;
    for (const [lang, list] of Object.entries(QUESTIONS)) expect(list, lang).toHaveLength(n);
  });
  it('индекс меняется каждый день и зацикливается', () => {
    const n = QUESTIONS.ru.length;
    const a = questionIndex('2026-10-01');
    expect(questionIndex('2026-10-02')).toBe((a + 1) % n);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(n);
  });
  it('questionText оборачивает индекс, в том числе отрицательный', () => {
    const n = QUESTIONS.ru.length;
    expect(questionText('ru', n)).toBe(questionText('ru', 0));
    expect(questionText('ru', -1)).toBe(QUESTIONS.ru[n - 1]);
  });
});

describe('generateUUID', () => {
  it('даёт уникальные значения формата UUID', () => {
    const a = generateUUID();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(generateUUID()).not.toBe(a);
  });
});
