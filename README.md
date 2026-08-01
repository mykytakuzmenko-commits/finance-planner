# Personal Finance Planner

Offline-first personal finance planning MVP: accounts, transactions, monthly
planning, plan-vs-fact analysis, dashboards & forecasts, weekly budgets,
savings & multi-currency, macro context, and a rule-based recommendation engine.

Personal financial data never leaves the browser — it is stored locally in
**IndexedDB**. Only non-personal macro data (currency rates, inflation, key
rates) is fetched through a thin API layer.

## Tech stack

- **React 19 + TypeScript**
- **Vite** (build & dev server)
- **IndexedDB** for local persistence (added in Milestone 2)
- **Vercel** for hosting & CI deployment from `main`

## Getting started

```bash
npm install
npm run dev      # start local dev server
npm run build    # type-check + production build to /dist
npm run preview  # preview the production build locally
```

## Project structure

```
/
├── index.html
├── vercel.json
├── public/                # static assets (favicon, etc.)
└── src/
    ├── main.tsx           # app entry
    ├── App.tsx            # root component
    ├── styles/            # global styles
    ├── db/                # IndexedDB layer          (Milestone 2+)
    ├── services/          # data access & API layer  (Milestone 2, 8)
    ├── calculations/      # balances, forecasts, plan-fact math
    ├── components/        # UI components
    └── utils/             # shared helpers
```

The structure follows the spec's recommended layout, adapted to a React/Vite
stack.

## Deployment

The `main` branch auto-deploys to Vercel over HTTPS. Every completed milestone
is committed, pushed, and verified on the production URL before moving on.

- **Production URL:** https://finance-planner-taupe.vercel.app/

## Milestone plan

| # | Milestone | Status |
|---|-----------|--------|
| 0 | Repository & deployment | ✅ Done |
| 1 | UI foundation & onboarding | ✅ Done |
| 2 | Accounts, categories & transactions | ✅ Done |
| 3 | Monthly planning & recurring operations | ✅ Done |
| 4 | Plan-fact linking & analysis | ✅ Done |
| 5 | Dashboard, forecast & safe-to-spend | ✅ Done |
| 6 | Weekly budget | ✅ Done |
| 7 | Savings, emergency fund & currencies | ✅ Done |
| 8 | Macro data | ✅ Done |
| 9 | Recommendation engine | ✅ Done |
| 10 | Backup, reports & reliability | ⏳ |

Each milestone ends with a deployed build and an explicit approval gate before
the next one begins.
