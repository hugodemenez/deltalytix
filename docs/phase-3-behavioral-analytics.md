## Phase 3 — Behavioral Analytics

### Added

- `lib/behavioral-analytics.ts`
  - Rule-based detectors for:
    - Revenge trading
    - FOMO
    - Overconfidence
    - Loss chasing
    - Overtrading
- `app/api/behavioral-analytics/route.ts`
  - Returns detections + aggregated summary for a user/account.
- `hooks/use-behavioral-analytics.ts`
  - Client hook for dashboard consumption.
- `components/behavioral/behavioral-alert-card.tsx`
  - Individual risk alert card.
- `components/behavioral/behavioral-alerts-panel.tsx`
  - Summary KPIs + alert grid.

### API

`GET /api/behavioral-analytics?userId=<id>&accountNumber=<optional>&limit=300`

### Output

- `detections[]`
- `summary.count`
- `summary.estimatedLoss`
- `summary.byType`

### Notes

- Current version is rule-based and explainable.
- Good base for future ML scoring.
- Uses existing `Trade` model from Prisma schema.
