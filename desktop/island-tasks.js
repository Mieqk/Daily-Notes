// Общий список задач с островом Atoll: что уходит на остров и что принимается в ответ.
// Вынесено из main.js, чтобы проверять тестами без Electron. Из страницы и из ответа берутся только известные поля.
const MAX_TASKS = 200;
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Тело запроса /app/tasks/sync или null, если дата не похожа на дату. */
function tasksBody(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const day = payload.day;
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;   // вся строка должна быть датой
  const tasks = (Array.isArray(payload.tasks) ? payload.tasks : []).slice(0, MAX_TASKS)
    .map((t) => ({ id: str(t && t.id, 80), text: str(t && t.text, 300), done: !!t && t.done === true }))
    .filter((t) => t.id && t.text.trim());
  return JSON.stringify({ app: 'Daily Note', day, tasks });
}

/**
 * Ответ острова: список действий. null означает «остров этого не умеет» (старая версия отвечает пустым телом)
 * или ответ не разобрался.
 */
function islandActions(text) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  if (!data || !Array.isArray(data.actions)) return null;
  return data.actions.slice(0, MAX_TASKS)
    .map((a) => ({ type: a && a.type, id: str(a && a.id, 80), text: str(a && a.text, 300), done: !!a && a.done === true }))
    .filter((a) => (a.type === 'toggle' && a.id) || (a.type === 'add' && a.text.trim()));
}

module.exports = { tasksBody, islandActions };
