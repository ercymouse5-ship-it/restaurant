# مطعمك على واتساب

واجهة عربية متعددة المطاعم تساعد الزبائن في مصر على اختيار الطعام وإرسال طلب مرتب للمطعم عبر واتساب.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/mat3am-ordering run dev` — run the restaurant ordering app
- `pnpm --filter @workspace/mat3am-ordering run typecheck` — typecheck the ordering app
- `PORT=24621 BASE_PATH=/ pnpm --filter @workspace/mat3am-ordering run build` — build its static frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Restaurant ordering UI: React + Vite, TypeScript, Tailwind CSS, Wouter, Zustand, Lucide

## Where things live

- `artifacts/mat3am-ordering/src/data/restaurants/` — typed restaurant configs and registry
- `artifacts/mat3am-ordering/src/store/cart.ts` — browser-persisted cart
- `artifacts/mat3am-ordering/src/App.tsx` and `src/index.css` — ordering experience and visual theme
- `artifacts/mat3am-ordering/README.md` — local run, restaurant setup, and Vercel deployment guide

## Architecture decisions

- No backend is required for the ordering experience; cart and customer details stay in the visitor's browser.
- Checkout opens a prefilled WhatsApp message; the visitor must send it to place the order.
- Each restaurant is a typed config file registered in the restaurant index.

## Product

- Arabic RTL restaurant directory and per-restaurant menu
- Searchable categories, item customization, combos, reviews, delivery areas and hours
- Persistent cart, saved delivery details, minimum-order validation and mobile ordering bar
- WhatsApp checkout, reorder, call and map links

## User preferences

- Keep visitor-facing copy Arabic and Egyptian-friendly.

## Gotchas

- Sample restaurant details, contact number, offer, reviews and order count are demo data; replace them before accepting real orders.
- Vite's build config expects `PORT` and `BASE_PATH`; set both when building outside the managed workflow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
