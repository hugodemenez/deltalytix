# 🚀 Deltalytix — Быстрый старт для разработки

## Предварительные требования

- [Node.js 20+](https://nodejs.org/) или [Bun](https://bun.sh/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

---

## Шаг 1 — Клонирование

```bash
git clone https://github.com/Bagirov24/deltalytix.git
cd deltalytix
```

---

## Шаг 2 — Переменные окружения

```bash
cp .env.local.example .env.local
```

Открой `.env.local` и заполни **обязательные** значения:

| Переменная | Где взять | Обязательно |
|---|---|---|
| `DATABASE_URL` | Docker локально или Supabase | ✅ |
| `DIRECT_URL` | То же самое | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.com → Settings → API | ✅ |
| `OPENAI_API_KEY` | platform.openai.com | ✅ |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | ✅ |
| `DISCORD_ID` + `DISCORD_SECRET` | discord.com/developers | ⚠️ для OAuth |
| `STRIPE_*` | dashboard.stripe.com | ⚠️ для платежей |

---

## Шаг 3 — База данных (Docker)

```bash
# Запускаем только PostgreSQL + pgAdmin
docker-compose -f docker-compose.dev.yml up -d
```

После запуска:
- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: http://localhost:5050 (admin@local.dev / admin)

---

## Шаг 4 — Установка зависимостей

```bash
# С Bun (рекомендуется — быстрее)
bun install

# Или с npm
npm install
```

---

## Шаг 5 — Миграции базы данных

```bash
# С Bun
bunx prisma migrate dev

# Или с npx
npx prisma migrate dev
```

Если Prisma спросит имя миграции — введи `init`.

---

## Шаг 6 — Запуск

```bash
# С Bun
bun dev

# Или с npm
npm run dev
```

Приложение доступно по адресу: **http://localhost:3000**

---

## Полезные команды

```bash
# Посмотреть базу данных в браузере
bunx prisma studio

# Сбросить базу и применить миграции заново
bunx prisma migrate reset

# Сгенерировать Prisma клиент после изменений схемы
bunx prisma generate

# Остановить Docker контейнеры
docker-compose -f docker-compose.dev.yml down

# Полный сброс (включая volumes — ВСЕ данные удалятся!)
docker-compose -f docker-compose.dev.yml down -v
```

---

## Структура проекта

```
deltalytix/
├── app/                    # Next.js App Router страницы
│   ├── (auth)/             # Страницы аутентификации
│   ├── (dashboard)/        # Основной дашборд
│   └── api/                # API routes
├── components/             # React компоненты
├── lib/                    # Утилиты и клиенты API
├── server/                 # Server actions
├── prisma/                 # Схема и миграции БД
├── locales/                # Переводы (EN/FR → добавим RU)
├── hooks/                  # React hooks
├── store/                  # Zustand stores
└── context/                # React contexts
```

---

## Roadmap добавлений (поверх форка)

- [ ] **Фаза 1** — ✅ Dev environment setup
- [ ] **Фаза 2** — Realtime Market Data (Finnhub)
- [ ] **Фаза 3** — Behavioral Analytics (revenge trading, FOMO detector)
- [ ] **Фаза 4** — Health Metrics Correlation
- [ ] **Фаза 5** — Gamification + Leaderboards  
- [ ] **Фаза 6** — Mobile PWA

---

## Поддержка

Проблемы с запуском? Открой [Issue](https://github.com/Bagirov24/deltalytix/issues) или проверь [оригинальную документацию](https://github.com/hugodemenez/deltalytix).
