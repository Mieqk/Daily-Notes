import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, checkPlaces, distanceM, newPlace, parsePlaces, type Place } from './lib/places';
import { makeVoice } from './voice-strings';
import type { Lang } from './i18n';

const T0 = 1_800_000_000_000; // реальные миллисекунды эпохи, а не малые числа
const shop = { lat: 53.9, lon: 27.5667 };
const at = (dLat: number) => ({ lat: shop.lat + dLat, lon: shop.lon });
const mk = (over: Partial<Place> = {}): Place => ({ ...newPlace({ name: 'Магазин', text: 'Купить хлеб', ...shop, radius: 200 }), inside: false, ...over });

describe('distanceM', () => {
  it('ноль в одной точке и ~111 км на градус широты', () => {
    expect(distanceM(shop, shop)).toBe(0);
    expect(distanceM(shop, at(1))).toBeGreaterThan(110_000);
    expect(distanceM(shop, at(1))).toBeLessThan(112_000);
  });
});

describe('checkPlaces', () => {
  it('вход в радиус даёт напоминание один раз', () => {
    const r1 = checkPlaces([mk()], at(0.0005), T0); // ~55 м
    expect(r1.fire).toHaveLength(1);
    expect(r1.places[0].inside).toBe(true);
    const r2 = checkPlaces(r1.places, at(0.0005), 1_060_000);
    expect(r2.fire).toHaveLength(0);
  });
  it('далеко от места ничего не происходит', () => {
    expect(checkPlaces([mk()], at(0.01), T0).fire).toHaveLength(0);
  });
  it('новое место, добавленное прямо тут, не срабатывает сразу', () => {
    const p = newPlace({ name: '', text: 'x', ...shop, radius: 200 });
    expect(checkPlaces([p], shop, T0).fire).toHaveLength(0);
  });
  it('после выхода и возвращения ждёт паузу', () => {
    const t0 = T0;
    let r = checkPlaces([mk()], shop, t0);
    expect(r.fire).toHaveLength(1);
    r = checkPlaces(r.places, at(0.01), t0 + 60_000); // ушли далеко
    expect(r.places[0].inside).toBe(false);
    r = checkPlaces(r.places, shop, t0 + 120_000); // вернулись слишком рано
    expect(r.fire).toHaveLength(0);
    r = checkPlaces(r.places, at(0.01), t0 + 130_000);
    r = checkPlaces(r.places, shop, t0 + COOLDOWN_MS + 200_000);
    expect(r.fire).toHaveLength(1);
  });
  it('граница не «моргает»: чуть за радиусом остаёмся внутри', () => {
    const p = mk({ inside: true, firedAt: 1 });
    expect(checkPlaces([p], at(0.002), T0 + 9_999_999).places[0].inside).toBe(true); // ~222 м при радиусе 200
  });
  it('выключенные места пропускаются', () => {
    expect(checkPlaces([mk({ enabled: false })], shop, T0).fire).toHaveLength(0);
  });
});

describe('parsePlaces', () => {
  it('отбрасывает мусор и чинит радиус', () => {
    const list = parsePlaces([{ text: 'a', lat: 1, lon: 2, radius: 3 }, { text: '', lat: 1, lon: 2 }, { text: 'b', lat: 99, lon: 2 }, null, 'x']);
    expect(list).toHaveLength(1);
    expect(list[0].radius).toBe(200);
    expect(parsePlaces('нет')).toEqual([]);
  });
});

describe('голосовые строки', () => {
  it('во всех языках есть все ключи и подстановка работает', () => {
    const langs: Lang[] = ['ru', 'en', 'be', 'uk', 'de', 'fr', 'es'];
    for (const l of langs) {
      const v = makeVoice(l);
      expect(v('plNear', { name: 'Z' }), l).toContain('Z');
      expect(v('plLimit', { n: 12 }), l).toContain('12');
      expect(v('dictAiConsent'), l).toMatch(/Gemini/);
    }
  });
});
