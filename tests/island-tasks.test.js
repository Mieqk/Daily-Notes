// Что приложение для ПК отправляет острову Atoll и что принимает в ответ (desktop/island-tasks.js).
import { describe, expect, it } from 'vitest';
import helpers from '../desktop/island-tasks.js';

const { tasksBody, islandActions } = helpers;

describe('задачи для острова: тело запроса', () => {
  it('берёт дату и только известные поля задач', () => {
    const body = JSON.parse(tasksBody({
      day: '2026-03-10', secret: 'не должно уйти',
      tasks: [{ id: 'a', text: 'Зарядка', done: false, extra: 1 }, { id: 'b', text: 'Отчёт', done: true }],
    }));
    expect(body).toEqual({
      app: 'Daily Note', day: '2026-03-10',
      tasks: [{ id: 'a', text: 'Зарядка', done: false }, { id: 'b', text: 'Отчёт', done: true }],
    });
  });

  it('пропускает то, что не похоже на задачу, и обрезает длинное', () => {
    const body = JSON.parse(tasksBody({
      day: '2026-03-10',
      tasks: [null, 5, { id: '', text: 'без id' }, { id: 'x', text: '   ' }, { id: 'ok', text: 'я'.repeat(1000), done: 'yes' }],
    }));
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].text).toHaveLength(300);
    expect(body.tasks[0].done).toBe(false);   // done должно быть настоящим true
  });

  it('не больше 200 задач', () => {
    const tasks = Array.from({ length: 500 }, (_, i) => ({ id: 't' + i, text: 'задача', done: false }));
    expect(JSON.parse(tasksBody({ day: '2026-03-10', tasks })).tasks).toHaveLength(200);
  });

  it('без списка задач уходит пустой список', () => {
    expect(JSON.parse(tasksBody({ day: '2026-03-10' })).tasks).toEqual([]);
    expect(JSON.parse(tasksBody({ day: '2026-03-10', tasks: 'nope' })).tasks).toEqual([]);
  });

  it.each([null, undefined, 'text', [], {}, { day: '10.03.2026' }, { day: 20260310 }, { day: '2026-03-10; drop' }])(
    'без нормальной даты запроса нет: %j', (payload) => { expect(tasksBody(payload)).toBeNull(); });
});

describe('задачи для острова: ответ', () => {
  it('принимает отметки и новые задачи', () => {
    const text = JSON.stringify({ actions: [
      { type: 'toggle', id: 'a', text: '', done: true },
      { type: 'add', id: 'tmp', text: 'Купить хлеб', done: false, extra: 'x' },
    ] });
    expect(islandActions(text)).toEqual([
      { type: 'toggle', id: 'a', text: '', done: true },
      { type: 'add', id: 'tmp', text: 'Купить хлеб', done: false },
    ]);
  });

  it('отбрасывает неизвестные и пустые действия', () => {
    const text = JSON.stringify({ actions: [
      null, 'x', { type: 'delete', id: 'a' }, { type: 'toggle', id: '' }, { type: 'add', text: '   ' },
      { type: 'toggle', id: 'ok', done: 'yes' },
    ] });
    expect(islandActions(text)).toEqual([{ type: 'toggle', id: 'ok', text: '', done: false }]);
  });

  it('пустой список действий — это не «не поддерживается»', () => {
    expect(islandActions('{"actions":[]}')).toEqual([]);
  });

  it.each(['', '{}', 'null', '[]', '{"actions":"no"}', 'не json'])(
    'старый остров или мусор в ответе означают null: %j', (text) => { expect(islandActions(text)).toBeNull(); });
});
