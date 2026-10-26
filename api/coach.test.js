import { describe, expect, it } from 'vitest';
import { parseReply, visibleLength } from './coach.js';

describe('parseReply', () => {
  it('обычный текст без позиций', () => {
    expect(parseReply('Пей больше воды.', 'food')).toEqual({ reply: 'Пей больше воды.', items: [] });
  });

  it('текст + ###ITEMS с продуктами', () => {
    const t = 'Это завтрак.\n###ITEMS\n[{"name":"Овсянка","grams":200,"kcal":150,"protein":5,"fat":3,"carbs":27}]';
    expect(parseReply(t, 'food')).toEqual({
      reply: 'Это завтрак.',
      items: [{ name: 'Овсянка', grams: 200, kcal: 150, protein: 5, fat: 3, carbs: 27 }],
    });
  });

  it('текст + ###ITEMS с упражнениями, вес по умолчанию 0', () => {
    const t = 'Вот план\n###ITEMS\n[{"name":"Присед","sets":3,"reps":10}]';
    expect(parseReply(t, 'workout').items).toEqual([{ name: 'Присед', sets: 3, reps: 10, kg: 0 }]);
  });

  it('в режиме hobby позиции всегда пустые', () => {
    expect(parseReply('Идея\n###ITEMS\n[{"name":"x"}]', 'hobby')).toEqual({ reply: 'Идея', items: [] });
  });

  it('битый JSON после маркера не ломает ответ', () => {
    expect(parseReply('Текст\n###ITEMS\n[{"name":', 'food')).toEqual({ reply: 'Текст', items: [] });
  });

  it('отбрасывает позиции без обязательных полей и ограничивает числа', () => {
    const t = 'ok\n###ITEMS\n[{"name":"","grams":1,"kcal":1,"protein":1,"fat":1,"carbs":1},{"name":"Яблоко","grams":99999,"kcal":-5,"protein":0,"fat":0,"carbs":"12,5"}]';
    expect(parseReply(t, 'food').items).toEqual([{ name: 'Яблоко', grams: 5000, kcal: 0, protein: 0, fat: 0, carbs: 12.5 }]);
  });

  it('не больше 12 позиций', () => {
    const arr = Array.from({ length: 20 }, (_, i) => ({ name: `ex${i}`, sets: 3, reps: 8 }));
    expect(parseReply(`ok\n###ITEMS\n${JSON.stringify(arr)}`, 'workout').items).toHaveLength(12);
  });

  it('понимает ответ-объект {reply, items}, в том числе в блоке кода', () => {
    const obj = '{"reply":"Привет","items":[{"name":"Жим","sets":2,"reps":5,"kg":40}]}';
    expect(parseReply(obj, 'workout')).toEqual({ reply: 'Привет', items: [{ name: 'Жим', sets: 2, reps: 5, kg: 40 }] });
    expect(parseReply('```json\n' + obj + '\n```', 'workout')?.reply).toBe('Привет');
  });

  it('пустой ответ даёт null', () => {
    expect(parseReply('   ', 'food')).toBeNull();
    expect(parseReply('###ITEMS\n[]', 'food')).toBeNull();
  });

  it('обрезает слишком длинный текст', () => {
    expect(parseReply('а'.repeat(3000), 'food').reply).toHaveLength(1500);
  });
});

describe('visibleLength', () => {
  it('без маркера виден весь текст', () => {
    expect(visibleLength('Привет, мир')).toBe(11);
  });
  it('текст обрезается по маркеру', () => {
    expect(visibleLength('Ответ\n###ITEMS\n[]')).toBe('Ответ\n'.length);
  });
  it('хвост, похожий на начало маркера, придерживается', () => {
    expect(visibleLength('Ответ\n###IT')).toBe('Ответ\n'.length);
    expect(visibleLength('Ответ #')).toBe('Ответ '.length);
  });
  it('решётка в середине текста не прячется', () => {
    expect(visibleLength('цена #5 рубля')).toBe('цена #5 рубля'.length);
  });
});
