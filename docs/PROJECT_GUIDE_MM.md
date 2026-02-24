# Ticket_v2 Project Document (Beginner Friendly - Burmese)

ဒီ document က `ticket_v2` project ကို ဘာမှမသိသေးတဲ့ developer တစ်ယောက်တောင် step-by-step နားလည်ပြီး local မှာ run လို့ရအောင် ရေးထားတာပါ။

## 1) Project ဆိုတာဘာလဲ

ဒီ project က **Internal Helpdesk System** ဖြစ်ပြီး feature အဓိက ၃ခုရှိပါတယ် -

1. **Helpdesk Ticketing**

- User တွေ ticket တင်
- Agent/Admin တွေ assign, update, resolve
- Priority + SLA due time tracking
- Audit log + comment thread + image upload

2. **Monitoring Alert Integration (Zabbix)**

- Zabbix problem တွေ sync လုပ်ပြီး UI မှာပြ
- ACK / status update လုပ်နိုင်
- Redis cache သုံးပြီး response မြန်အောင်လုပ်ထား

3. **Reporting / Analysis Dashboard**

- Date filter နဲ့ KPI/Chart/Recent Ticket ပြ
- CSV export ဖြုတ်လို့ရ

---

## 2) Tech Stack အမြန်နားလည်ရန်

- **Frontend / Fullstack Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Auth**: NextAuth (Credentials)
- **ORM / DB**: Prisma + PostgreSQL
- **Realtime**: Socket.IO
- **Cache**: Redis (ioredis)
- **Charts**: Chart.js
- **Validation**: Zod
- **Date Utils**: date-fns + dayjs + moment (mixed usage)
- **Mail/IMAP**: Nodemailer + Imap + Mailparser

---

## 3) High-Level Architecture (လုံးဝအခြေခံပုံ)

Browser ကနေ request ပေးတဲ့အခါ project ထဲမှာ ဒီလိုစီးဆင်းပါတယ် -

1. `src/app/...` ထဲက page/component ကို render
2. Data လိုရင်

- Server Action (`"use server"`) ကိုခေါ်
- သို့မဟုတ် API Route (`src/app/api/...`) ကိုခေါ်

3. Server side မှာ Prisma သုံးပြီး PostgreSQL နဲ့ communicate
4. လိုအပ်ရင် Redis cache / Socket server / External Zabbix API / Mail integration ကိုခေါ်
5. Result ပြန်ပို့

---

## 4) Folder Structure (အရေးကြီးပဲ)

### Root level

- `package.json`: script + dependency
- `prisma/schema.prisma`: database schema
- `prisma/migrations/*`: DB migration history
- `prisma/seed.ts`: initial data seed
- `src/`: application source

### `src/app`

- `layout.tsx`: global layout + provider + Chatwoot script
- `auth/*`: signin pages
- `helpdesk/*`: main app features
- `api/*`: REST-like endpoints

### `src/app/helpdesk`

- `layout.tsx`: top nav + role-based menu
- `page.tsx`: overview dashboard
- `tickets/*`: ticket list/create/edit/detail
- `analysis/*`: reporting dashboard + date filter + CSV
- `alerts/*`: zabbix alerts table
- `department/*`, `category/*`, `user/*`: configuration modules

### `src/libs`

- `auth.ts`: NextAuth options
- `prisma.ts`: Prisma client adapter
- `action.ts`: shared server actions (comment/user helpers)
- `socket-client.ts` / `socket-server.ts`: realtime
- `redis.ts`: redis client
- `cron.ts`: scheduled jobs

### `src/components`

- Reusable UI + ticket form sub-components + comment/audit/search widgets

---

## 5) Authentication + Authorization

### Login Flow

- Login UI: `src/app/auth/signin/page.tsx`
- Auth API: `src/app/api/auth/[...nextauth]/route.ts`
- Credentials provider email/password compare with bcrypt
- Session strategy = JWT

### Role & Access Control

- Middleware: `src/middleware.ts`
- `/helpdesk/:path*` သည် login မရှိရင် redirect `/auth/signin`
- Admin-only routes:
  - `/helpdesk/department`
  - `/helpdesk/category`
  - `/helpdesk/user`

Allowed roles = `ADMIN`, `SUPER_ADMIN`

### Role enum

- `REQUESTER`
- `AGENT`
- `ADMIN`
- `SUPER_ADMIN`

---

## 6) Main Feature-by-Feature Breakdown

## 6.1 Ticket Module (Project Core)

### Main files

- `src/app/helpdesk/tickets/page.tsx` (table list)
- `src/app/helpdesk/tickets/action.ts` (business logic)
- `src/app/helpdesk/tickets/TicketForm.tsx` (form container)
- `src/app/helpdesk/tickets/useTicketForm.ts` (form state + submit)
- `src/app/helpdesk/tickets/[id]/page.tsx` (edit/detail)

### Ticket Create Flow (Server)

`createTicket(formData)` in `tickets/action.ts`:

1. Zod validate input
2. current user id ယူ
3. department/category existence စစ်
4. monthly sequence ticket ID generate (`TKT-YYYY-MM-###`)
5. SLA row by priority (`SLA` table) lookup
6. `responseDue` / `resolutionDue` calculate
7. `ticket` create
8. images ရှိရင် `TicketImage` createMany
9. `Audit` row (CREATE) create

### Ticket Update Flow

`updateTicket(ticketId, formData)`:

1. validate input
2. old ticket data fetch
3. image keep/delete/new merge
4. priority အလိုက် SLA recalc
5. ticket update
6. old vs new compare -> changes array build
7. `Audit` row (UPDATE + changes JSON) create

### Ticket List

- Filter groups: Ownership, Status, Priority, Archived, SLA
- Search query filters by column
- Pagination
- Selected rows -> client-side CSV download

### Ticket Detail Page

- Form edit
- Audit panel
- Comment section (threaded replies + like + typing indicator)

---

## 6.2 Comments + Realtime

### Files

- `src/components/CommentSection.tsx`
- `src/components/CommentInput.tsx`
- `src/components/CommentItem.tsx`
- `src/libs/socket-client.ts`
- `src/libs/socket-server.ts`
- `src/libs/action.ts` (`uploadComment`, `likeComment`, `getCommentWithTicketId`)

### Realtime events

- `join-ticket`
- `typing` -> `user-typing`
- `send-comment` -> `new-comment`
- `update-ticket` -> `ticket-updated`

### Concept

Ticket တစ်ခုကို room အဖြစ်သုံးပြီး room-based broadcast လုပ်ထားတာမို့ တခြား ticket event မရောက်ဘဲ isolate ဖြစ်ပါတယ်။

---

## 6.3 Overview Dashboard (`/helpdesk`)

- Department stats cards (from `department/action.ts`)
- My ticket stats (from `tickets/action.ts` `getMyTickets`)
- Quick links to filtered ticket pages

---

## 6.4 Department Module

### Files

- `department/page.tsx`: list + search
- `department/new/page.tsx`: create form
- `department/action.ts`: create + stats + names

### Behavior

- Department create with validation + duplicate check
- Audit create for department
- each department card မှာ New/Open/Urgent/Unassigned/Closed counters

---

## 6.5 Category Module

### Files

- `category/page.tsx`
- `category/action.ts`

### Behavior

- Category create/update
- Department နှင့် bind (category belongs to one department)
- UI သည် edit mode reuse form pattern

---

## 6.6 User Module

### Files

- `user/page.tsx`, `user/new/page.tsx`, `user/[id]/page.tsx`
- `user/action.ts`

### Behavior

- create user (password hash)
- update user
- user ticket stats (assigned + created, status breakdown)

---

## 6.7 Analysis/Reporting Module

### Files

- `analysis/page.tsx`
- `analysis/action.ts`
- `analysis/date-filter.ts`
- `analysis/filter-range.ts`
- `analysis/components/*`
- `api/helpdesk/export/route.ts`

### Dashboard data

`getAnalysisDashboardData(filters)` return:

- KPI (total/open/closed/high priority)
- Department performance dataset
- Priority breakdown
- Recent tickets

### Date Filter

- quick range: All Time / Today / Last 7 / Last 30 / This Month
- custom fromDate/toDate
- invalid range validation

### Download

- `Download CSV` button -> `/api/helpdesk/export?fromDate=...&toDate=...`
- server-side CSV with auth check

---

## 6.8 Alerts Module (Zabbix)

### UI files

- `alerts/ZabbixProblemsTable.tsx`
- `alerts/Body.tsx`
- `alerts/ColumnPicker.tsx`

### Server/API files

- `api/alerts/route.ts` (read alerts with redis cache)
- `api/alerts/sync/route.ts` (sync from zabbix + webhook)
- `api/alerts/ack/route.ts` (acknowledge)
- `api/alerts/status/route.ts` (status update)

### Important flow

1. cron/manual call -> `/api/alerts/sync` (GET)
2. route fetches Zabbix problems/triggers/items (batch)
3. upsert `ZabbixTicket`
4. clear redis keys (`tickets:unacknowledged:*`)
5. UI fetch from `/api/alerts`

Webhook mode (`POST /api/alerts/sync`) လည်း support ပါပြီး payload variations ကို flexible parse လုပ်ထားပါတယ်။

---

## 6.9 Upload Module

- `POST /api/uploads` : file upload to `/uploads`
- `GET /api/uploads/[filename]` : serve image
- `DELETE /api/uploads/[filename]` : delete file

Ticket image/comment image တင်ရာမှာ အသုံးများပါတယ်။

---

## 6.10 Mail Integration

- `src/scripts/mail-listener.js`
- `src/scripts/gmail-imap.js`
- `src/app/api/new-mail/route.ts`

Mail body ထဲက `Original event ID` ကို extract လုပ်ပြီး Zabbix event status နဲ့ DB record sync လုပ်ပေးပါတယ်။

---

## 6.11 Cron Jobs

File: `src/libs/cron.ts`

ရှိနေတဲ့ schedule logic:

1. Cleanup placeholder job
2. SLA violation checker (currently every minute)
3. Zabbix sync caller (every minute, hits `/api/alerts/sync`)

---

## 7) Database Model Summary (Prisma)

Schema file: `prisma/schema.prisma`

### Key enums

- `Role`, `Priority`, `Status`, `Severity`, `AuditAction`

### Main tables

- `User`: account, role, department, created/updated relations
- `Department`: team/department master
- `Category`: per-department category
- `Ticket`: core helpdesk record
- `SLA`: priority-based timing rules
- `TicketImage`: ticket attachments
- `Comment`, `CommentLike`: discussion thread + likes
- `TicketView`: user view tracking
- `Audit`: change history
- `ZabbixTicket`: monitoring alerts snapshot
- `MailSetting`: mail recipients config

### Critical relationships

- User 1..N Ticket (requester)
- User 1..N Ticket (assignedTo)
- Department 1..N Ticket
- Department 1..N Category
- Category 1..N Ticket
- Ticket 1..N Comment / TicketImage / Audit(by entityId concept)
- Comment self relation for replies

---

## 8) API Endpoint Reference

## Auth

- `GET/POST /api/auth/[...nextauth]`
  - Purpose: login/session

## Alerts

- `GET /api/alerts`
  - Header: `x-api-key`
  - Purpose: current alerts (cached)
- `GET /api/alerts/sync`
  - Header: `x-api-key`
  - Purpose: fetch from Zabbix and upsert
- `POST /api/alerts/sync`
  - Header auth via webhook secret/bearer/query
  - Purpose: webhook ingest
- `POST /api/alerts/ack`
  - Body: `{ eventids: string[], user?: string }`
- `POST /api/alerts/status`
  - Body: `{ eventids: string[], status: string, user?: string }`

## Helpdesk

- `GET /api/helpdesk/export?fromDate&toDate`
  - Auth: session required
  - Purpose: analysis CSV

## Upload

- `POST /api/uploads`
- `GET /api/uploads/[filename]`
- `DELETE /api/uploads/[filename]`

## Mail

- `POST /api/new-mail`
  - Purpose: parse incoming mail and update zabbix ticket status

---

## 9) Environment Variables (Required/Optional)

Project code ထဲ reference လုပ်ထားတဲ့ env keys list:

### Core

- `DATABASE_URL` (Prisma/PostgreSQL)
- `AUTH_SECRET` (NextAuth/JWT)

### Alerts / Zabbix

- `API_SECRET_KEY` (internal API key)
- `ZABBIX_URL`
- `ZABBIX_API_TOKEN`
- `ZABBIX_WEBHOOK_SECRET` (optional but recommended)
- `BASE_URL` (cron calling own API)

### Realtime

- `WEB_SOCKET_PORT` (socket server)
- `NEXT_PUBLIC_WEB_SOCKET_URL`
- `NEXT_PUBLIC_WEB_SOCKET_PORT`

### Redis

- `REDIS_URL`

### Mail/IMAP/SMTP

- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_SERVER_USER` (cron mail helper)
- `EMAIL_SERVER_PASS` (cron mail helper)
- `NEXT_PUBLIC_APP_URL` (mail listener callback)

### Notes

- `.env` file ထဲရှိ key နဲ့ code ထဲ key name mismatch မဖြစ်စေရန် အရေးကြီးပါတယ်။
- `NEXT_PUBLIC_*` keys တွေက browser side ထိ expose ဖြစ်နိုင်တာကိုသတိပြုပါ။

---

## 10) Local Setup (First Time)

## Prerequisites

1. Node.js 20+
2. PostgreSQL
3. Redis (alerts cache သုံးချင်ရင်)

## Install

```bash
npm install
```

## Generate Prisma Client

```bash
npm run generate
```

## Run Migration

```bash
npm run migrate
```

## Seed initial data

```bash
npx tsx prisma/seed.ts
```

## Start Next app

```bash
npm run dev
```

## Start Socket server (separate terminal)

```bash
npx tsx src/libs/socket-server.ts
```

## Optional: start cron worker

```bash
npx tsx src/libs/cron.ts
```

## Optional: start mail listener

```bash
npx tsx src/scripts/mail-listener.js
```

---

## 11) Beginner User Journey (အသုံးပြုပုံ)

### Requester

1. Sign in
2. Tickets -> New
3. title/description/department/category/priority ဖြည့်
4. Create
5. comment, attachment ဖြင့် follow-up

### Agent

1. Ticket list filters သုံးပြီး assigned tickets ကြည့်
2. status update + priority change (remark required)
3. assignee/category/department update
4. audit log မှာ changes စစ်

### Admin/Super Admin

1. Department/Category/User manage
2. Analysis dashboard report + CSV export
3. Alerts စောင့်ကြည့်၊ ACK/status update

---

## 12) Troubleshooting

## 1. Prisma connection error

- `DATABASE_URL` မမှန်
- Postgres service မတက်

## 2. Cannot login / session issue

- `AUTH_SECRET` မရှိ
- bcrypt compare fail (wrong password)

## 3. Socket not connecting

- socket server မတက်
- `NEXT_PUBLIC_WEB_SOCKET_URL/PORT` မကိုက်
- firewall/port issue

## 4. Alerts not showing

- `/api/alerts` header key မမှန်
- Redis unavailable (logs စစ်)
- Zabbix URL/token မမှန်

## 5. CSV export unauthorized

- login session မရှိ/expired

## 6. Uploaded images not loading

- `/uploads` folder permission
- filename route access check

---

## 13) Known Risks / Technical Debt (Current Codebase Observations)

1. **Hardcoded secrets risk**

- `src/libs/redisClient.ts`
- `src/scripts/gmail-imap.js`

2. **Duplicate/legacy code fragments**

- many files contain large commented old versions
- maintainability လျော့နိုင်

3. **Two auth config sources**

- `src/libs/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
  behavior drift ဖြစ်နိုင်

4. **Seed duplication risk**

- SLA createMany re-run on existing unique priority may fail

5. **Mixed date libraries**

- dayjs/date-fns/moment together -> consistency issue

---

## 14) New Developer Checklist

1. env keys အားလုံး set ပြီး verify
2. DB migration + seed run
3. login success စမ်း
4. ticket create/update/comment/realtime စမ်း
5. analysis filter + CSV export စမ်း
6. alerts sync route with API key စမ်း
7. production မတင်မီ hardcoded secrets ကို env သို့ပြောင်း

---

## 15) Quick File Index (Most Important)

- Auth: `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`
- Ticket business logic: `src/app/helpdesk/tickets/action.ts`
- Ticket UI form: `src/app/helpdesk/tickets/TicketForm.tsx`
- Comment/realtime: `src/components/CommentSection.tsx`, `src/libs/socket-client.ts`, `src/libs/socket-server.ts`
- Analysis data: `src/app/helpdesk/analysis/action.ts`
- Date filter core: `src/app/helpdesk/analysis/date-filter.ts`
- CSV export: `src/app/api/helpdesk/export/route.ts`
- Alerts sync: `src/app/api/alerts/sync/route.ts`
- Prisma schema: `prisma/schema.prisma`

---

ဒီ document က project architecture + flow + setup + risk တွေကို beginner perspective နဲ့ဖော်ပြထားတာမို့ onboarding, handover, audit review သုံးခုလုံးအတွက် အသုံးဝင်ပါတယ်။
