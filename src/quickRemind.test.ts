import { describe, expect, it } from 'vitest';
import { dueQuick, parseQuick, parseQuickList, presets, newQuick, DONE_KEEP_MS } from './lib/quickRemind';
import { makeQuick } from './quick-remind-strings';
import type { Lang } from './i18n';

// 2026-11-03 14:00 по местному времени
const NOW = new Date(2026, 10, 3, 14, 0, 0).getTime();
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0).getTime();

describe('parseQuick', () => {
  it('без времени: текст как есть, at = null', () => {
    expect(parseQuick('купить хлеб', NOW)).toEqual({ text: 'купить хлеб', at: null });
    expect(parseQuick('купить 2 хлеба', NOW).at).toBeNull();
  });
  it('«через 15 минут», «через час», «через полчаса», «через 2 часа»', () => {
    expect(parseQuick('позвонить маме через 15 минут', NOW)).toEqual({ text: 'позвонить маме', at: NOW + 15 * 60_000 });
    expect(parseQuick('через час выпить воды', NOW)).toEqual({ text: 'выпить воды', at: NOW + 3_600_000 });
    expect(parseQuick('через полчаса чай', NOW).at).toBe(NOW + 30 * 60_000);
    expect(parseQuick('через 2 часа встреча', NOW).at).toBe(NOW + 2 * 3_600_000);
    expect(parseQuick('call mom in 10 min', NOW)).toEqual({ text: 'call mom', at: NOW + 10 * 60_000 });
    expect(parseQuick('stretch in 2 hours', NOW).at).toBe(NOW + 2 * 3_600_000);
  });
  it('«завтра в 9 купить хлеб»', () => {
    expect(parseQuick('завтра в 9 купить хлеб', NOW)).toEqual({ text: 'купить хлеб', at: at(4, 9) });
    expect(parseQuick('купить хлеб завтра в 9:30', NOW)).toEqual({ text: 'купить хлеб', at: at(4, 9, 30) });
    expect(parseQuick('tomorrow at 8am gym', NOW)).toEqual({ text: 'gym', at: at(4, 8) });
    expect(parseQuick('послезавтра врач', NOW).at).toBe(at(5, 9));
  });
  it('«в 18:00» сегодня, а если время уже прошло, то завтра', () => {
    expect(parseQuick('в 18:00 тренировка', NOW)).toEqual({ text: 'тренировка', at: at(3, 18) });
    expect(parseQuick('в 9 зарядка', NOW).at).toBe(at(4, 9));
    expect(parseQuick('20:30 фильм', NOW).at).toBe(at(3, 20, 30));
  });
  it('части суток и «вечера/pm»', () => {
    expect(parseQuick('вечером погулять', NOW)).toEqual({ text: 'погулять', at: at(3, 19) });
    expect(parseQuick('завтра утром бег', NOW).at).toBe(at(4, 9));
    expect(parseQuick('в 9 вечера позвонить', NOW).at).toBe(at(3, 21));
    expect(parseQuick('at 9pm movie', NOW).at).toBe(at(3, 21));
    expect(parseQuick('завтра в 11 ночи', NOW).at).toBe(at(4, 23));
  });
  it('другие языки', () => {
    expect(parseQuick('morgen um 8 Brot kaufen', NOW)).toEqual({ text: 'Brot kaufen', at: at(4, 8) });
    expect(parseQuick('demain à 9h30 pain', NOW).at).toBe(at(4, 9, 30));
    expect(parseQuick('mañana a las 7 pan', NOW).at).toBe(at(4, 7));
    expect(parseQuick('заўтра ў 8 хлеб', NOW)).toEqual({ text: 'хлеб', at: at(4, 8) });
    expect(parseQuick('завтра о 9 хліб', NOW).at).toBe(at(4, 9));
  });
  it('убирает «напомни»', () => {
    expect(parseQuick('напомни мне завтра в 9 купить хлеб', NOW).text).toBe('купить хлеб');
    expect(parseQuick('remind me to call mom in 5 min', NOW).text).toBe('call mom');
  });
});

describe('presets', () => {
  it('днём есть «вечером», вечером его нет', () => {
    expect(presets(NOW).map((p) => p.id)).toEqual(['m15', 'h1', 'evening', 'tomorrow']);
    expect(presets(at(3, 20)).map((p) => p.id)).toEqual(['m15', 'h1', 'tomorrow']);
    expect(presets(NOW).find((p) => p.id === 'tomorrow')!.at).toBe(at(4, 9));
  });
});

describe('dueQuick', () => {
  it('срабатывает один раз, потом помечается и со временем убирается', () => {
    const r = newQuick('хлеб', NOW - 1000);
    const a = dueQuick([r], NOW);
    expect(a.fire).toHaveLength(1);
    expect(a.list[0].done).toBe(true);
    expect(dueQuick(a.list, NOW + 1000).fire).toHaveLength(0);
    expect(dueQuick(a.list, NOW + DONE_KEEP_MS + 5000).list).toHaveLength(0);
    expect(dueQuick([newQuick('позже', NOW + 60_000)], NOW).fire).toHaveLength(0);
  });
});

describe('parseQuickList', () => {
  it('отбрасывает мусор', () => {
    expect(parseQuickList('x')).toEqual([]);
    expect(parseQuickList([{ id: 'a', text: 'b', at: 5 }, { id: 1 }, null, { id: 'c', text: 'd', at: NaN }])).toEqual([{ id: 'a', text: 'b', at: 5, done: false }]);
  });
});

describe('строки', () => {
  it('все ключи есть во всех языках', () => {
    const langs: Lang[] = ['ru', 'en', 'be', 'uk', 'de', 'fr', 'es'];
    const keys = Object.keys(JSON.parse(JSON.stringify(makeQuick('ru').all)));
    for (const l of langs) expect(Object.keys(makeQuick(l).all).sort()).toEqual(keys.sort());
  });
});
