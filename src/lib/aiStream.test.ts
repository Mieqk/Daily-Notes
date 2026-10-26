import { describe, expect, it } from 'vitest';
import { parseStreamLine } from './aiStream';

describe('parseStreamLine', () => {
  it('распознаёт кусок текста', () => {
    expect(parseStreamLine('{"d":"Привет"}')).toEqual({ kind: 'delta', text: 'Привет' });
  });
  it('пустой кусок текста всё равно кусок', () => {
    expect(parseStreamLine('{"d":""}')).toEqual({ kind: 'delta', text: '' });
  });
  it('итог с done', () => {
    const ev = parseStreamLine('{"done":true,"reply":"ок","items":[]}');
    expect(ev).toEqual({ kind: 'final', data: { done: true, reply: 'ок', items: [] } });
  });
  it('ошибка тоже итог', () => {
    expect(parseStreamLine('{"error":"ai failed","detail":"x"}')).toMatchObject({ kind: 'final', data: { error: 'ai failed' } });
  });
  it('обычный JSON-ответ без done понимается как итог', () => {
    expect(parseStreamLine('{"reply":"текст"}')).toMatchObject({ kind: 'final' });
  });
  it('мусор, пустые строки и не-объекты игнорируются', () => {
    for (const s of ['', '   ', 'не json', '{oops', 'null', '42', '[]', '{"x":1}']) expect(parseStreamLine(s)).toBeNull();
  });
  it('пробелы вокруг строки не мешают', () => {
    expect(parseStreamLine('  {"d":"a"}\r')).toEqual({ kind: 'delta', text: 'a' });
  });
});
