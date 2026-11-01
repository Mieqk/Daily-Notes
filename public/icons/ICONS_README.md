# Иконки приложения

Все иконки (SVG и PNG всех размеров) генерируются одним скриптом из общего описания:

```
node scripts/generate-icons.mjs
```

Нужен `playwright` (в зависимости проекта не входит). Чтобы изменить рисунок, правьте описание в `scripts/generate-icons.mjs` и запустите скрипт заново.

| Файл | Где используется |
| --- | --- |
| `icon.svg`, `icon-192.png`, `icon-512.png` | PWA, purpose `any` (скруглённая иконка) |
| `icon-maskable-192.png`, `icon-maskable-512.png` | PWA, purpose `maskable` (во весь квадрат, рисунок в безопасной зоне) |
| `apple-touch-icon-*.png`, `../apple-touch-icon.png` | iPhone/iPad, «На экран Домой» |
| `../favicon.svg`, `../favicon-32.png` | вкладка браузера |
| `android-foreground-432.png`, `android-background-432.png` | adaptive icon в APK (слои 108dp), собираются в `.github/workflows/android-apk.yml` |

Сервис-воркер отдаёт иконки из кэша и тихо обновляет их, поэтому новая иконка подтянется сама.
