# Copilot Instructions for Deltalytix

## Project Overview

Deltalytix is a Next.js 15 trading analytics platform with multi-tenant support, real-time broker integrations, and AI-powered insights. Built with TypeScript, Prisma, Supabase, and Stripe.

## Architecture Principles

### Server Actions Over API Routes (Critical)
**ALWAYS prefer Server Actions for data manipulation** - this is a core architectural decision:

1. **Server Actions are MORE secure**: 
   - No random POST endpoints exposed that can access user data through cookie headers
   - Built-in CSRF protection from Next.js
   - Type-safe function calls, not HTTP endpoints

2. **Offload client-side compute**:
   - Heavy calculations happen on the server (account metrics, trade analytics)
   - Client only receives final results
   - Better performance on low-end devices

3. **When to use each**:
   - **Server Actions** (`/server/*.ts` with `'use server'`): ALL mutations, authenticated operations, heavy compute
   - **API Routes** (`/app/api/*`): ONLY for public/cacheable GET requests (OpenGraph images, RSS feeds, webhooks from external services)
   
Example pattern:
```typescript
// ✅ CORRECT - Server Action for mutations
'use server'
export async function updateTradeAction(trade: Trade) {
  const userId = await getUserId() // Secure, no exposed endpoint
  return prisma.trade.update({ where: { id: trade.id, userId } })
}

// ❌ WRONG - API route for mutations
export async function POST(req: Request) { // Exposed endpoint, less secure
  const userId = getUserId() // Still has access via cookies, but more attack surface
}
```

### Server vs Client Components
- **Default to Server Components** - Only use `'use client'` when necessary (interactivity, hooks, browser APIs)
- All `/server/*.ts` files export async functions with `'use server'` directive
- Client components marked with `'use client'` at top of file

### Data Flow Architecture
1. **Authentication**: Supabase Auth → Prisma User record
2. **State Management**:
   - Server state: Prisma (single source of truth)
   - Client state: Zustand stores (`/store/*`) + React Context (`/context/*`)
   - All stores follow pattern: `export const useXStore = create<XStore>()(...)` 
3. **Data Mutations**: Always through Server Actions, never direct API calls from client
4. **Computed Metrics**: Shared utilities in `/lib/account-metrics.ts` - identical logic on server AND client for consistency

### Database Patterns
- **Prisma singleton**: Use shared instance from `lib/prisma.ts`, never create new clients
- **Schema organization**: All models in single `prisma/schema.prisma` with `@@schema("public")`
- **Migrations**: `bunx prisma migrate dev --name <description>` (Bun preferred over npm)
- **Type safety**: Import types from `@prisma/client`, extend in `/types/*.ts` or `/context/data-provider.tsx`
- **Computed fields**: Never store in DB - calculate from raw data (e.g., `balanceToDate`, `metrics`, `dailyMetrics`)

## Critical Conventions

### Server Actions Naming
**ALL Server Actions MUST end with `Action` suffix:**
```typescript
// ✅ Correct
export async function setupAccountAction(account: Account): Promise<Account>
export async function getTradesAction(userId: string): Promise<Trade[]>

// ❌ Wrong - missing Action suffix
export async function setupAccount(account: Account)
```

### Translation System (i18n)
**Never hardcode user-facing text** - use `next-international`:
```typescript
// In client components
import { useI18n } from "@/locales/client"
const t = useI18n()
<CardTitle>{t('propFirm.title')}</CardTitle>

// With variables
<DialogTitle>{t('propFirm.configurator.title', { accountNumber: account.accountNumber })}</DialogTitle>

// In server components
import { getI18n } from "@/locales/server"
const t = await getI18n()
```

- Translation files: `/locales/[lang].ts` (11 languages: en, fr, de, es, it, pt, vi, hi, ja, zh, yo)
- Locale routing: All pages under `/app/[locale]/` for automatic routing

### Import Paths
**Always use `@/*` aliases** (configured in `tsconfig.json`):
```typescript
// ✅ Correct
import { createClient } from '@/lib/supabase'
import { useAccountStore } from '@/store/account-store'
import { calculateAccountBalanceAction } from '@/server/accounts'

// ❌ Wrong - relative imports
import { createClient } from '../../lib/supabase'
```

## Key Developer Workflows

### Database Schema Changes
```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
bunx prisma migrate dev --name account_buffer

# 3. Generate client (if not auto-run)
bunx prisma generate

# 4. Verify in Prisma Studio
bunx prisma studio
```

### Adding New Server Action
1. Create in `/server/*.ts` with `'use server'` directive
2. Name with `Action` suffix: `doSomethingAction`
3. Call `getUserId()` from `server/auth.ts` for auth
4. Use Prisma singleton from `lib/prisma.ts`
5. Return typed data, throw errors (not Response objects)

### Creating Zustand Store
1. Create in `/store/*-store.ts`
2. Follow pattern from existing stores:
```typescript
import { create } from 'zustand'

interface XStore {
  data: string[]
  setData: (data: string[]) => void
}

export const useXStore = create<XStore>()((set) => ({
  data: [],
  setData: (data) => set({ data }),
}))
```

### Adding Dashboard Widget
**Widgets are central to Deltalytix** - the dashboard is a customizable widget canvas. Follow this workflow:

1. **Create widget component** in appropriate subfolder:
   - Charts: `/app/[locale]/dashboard/components/charts/`
   - Statistics cards: `/app/[locale]/dashboard/components/statistics/`
   - Tables: `/app/[locale]/dashboard/components/tables/`
   - Other: `/app/[locale]/dashboard/components/calendar/`, `/chat/`, etc.

2. **Register in widget registry** (`/app/[locale]/dashboard/config/widget-registry.tsx`):
```typescript
export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  myNewWidget: {
    type: 'myNewWidget',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    category: 'charts', // or 'statistics', 'tables', 'other'
    previewHeight: 300,
    getComponent: ({ size }) => <MyNewWidget size={size} />,
    getPreview: () => <MyNewWidget size="small" />
  },
  // ... other widgets
}
```

3. **Add to WidgetType union** in `/app/[locale]/dashboard/types/dashboard.ts`:
```typescript
export type WidgetType = 
  | 'equityChart'
  | 'myNewWidget' // Add here
  | ...
```

4. **Widget sizing system**:
   - Desktop: `tiny` (3x1), `small` (3x4), `small-long` (6x2), `medium` (6x4), `large` (6x8), `extra-large` (12x8)
   - Mobile: All widgets become full-width (12 columns), only height varies
   - Specify allowed sizes in registry (e.g., tiny widgets can't be resized)

5. **Add translations** to all 11 locale files (`/locales/[lang].ts`)

6. **Widget features**:
   - Drag-and-drop reordering (React Grid Layout)
   - Resize handles (only in customization mode)
   - Size change controls (popover with allowed sizes)
   - Remove widget (with confirmation dialog)
   - Desktop/mobile layouts saved separately in database

## Integration Points

### Broker Sync Services
- **Tradovate**: Token-based API sync (hourly cron: `/app/api/cron/renew-tradovate-token/route.ts`)
- **Rithmic**: Proprietary service integration via `context/rithmic-sync-context.tsx`
- **IBKR**: PDF parsing with `@vercel/sandbox` in `/app/[locale]/dashboard/components/import/ibkr-pdf/`
- **AI Field Mapping**: OpenAI-powered CSV import in `/app/api/ai/mappings/route.ts`

### External Services
- **Databento**: Historical data for MAE/MFE analysis (`lib/databento.ts`)
- **Stripe**: Webhooks at `/app/api/stripe/webhooks/route.ts`, helpers in `lib/stripe-helpers.ts`
- **Supabase**: Auth + Storage, client in `lib/supabase.ts`, server client in `server/auth.ts`

### Cron Jobs
Located in `/app/api/cron/`:
- `renew-tradovate-token` - Refresh auth tokens
- `compute-trade-data` - Calculate MAE/MFE analytics
- `renewal-notice` - Subscription renewal emails

## Common Patterns

### Widget Canvas Architecture
**The dashboard is a drag-and-drop widget canvas** - understanding this is critical:

**Layout persistence flow**:
```typescript
// 1. User drags/resizes widget
// 2. handleLayoutChange in widget-canvas.tsx triggers
// 3. Update Zustand store (useUserStore)
// 4. Save to database via Server Action (saveDashboardLayoutAction)
// 5. Store in DashboardLayout table (desktop/mobile as JSON)
```

**Key files**:
- `widget-canvas.tsx` - Main canvas component with React Grid Layout
- `widget-registry.tsx` - Central registry of all available widgets
- `add-widget-sheet.tsx` - Sheet for adding new widgets (categorized)
- `types/dashboard.ts` - Widget type definitions

**Customization mode**:
- Toggle on: Widgets show drag handles, resize controls, remove buttons
- Toggle off: Widgets are static, normal interaction
- Click outside widgets → automatically exit customization
- Mobile: Always uses blur effect when customizing (no hover state)

**Responsive behavior**:
- Desktop: 12-column grid with complex layouts
- Mobile: All widgets full-width (12 cols), stack vertically
- Layouts saved separately (desktop/mobile) in database
- Widget sizes auto-adjust: `sizeToGrid(size, isMobile)`

### Account Metrics Computation
**Critical**: Use shared utility to ensure server/client consistency:
```typescript
import { computeMetricsForAccounts } from '@/lib/account-metrics'

// Works identically on server and client
const accountsWithMetrics = computeMetricsForAccounts(accounts, trades)
```

Never calculate metrics differently in server vs client code - use the shared utility.

### Error Handling in Server Actions
```typescript
export async function doSomethingAction(data: string): Promise<Result> {
  try {
    const userId = await getUserId() // May throw if not authenticated
    // ... operation
    return { success: true, data }
  } catch (error) {
    console.error('Error in doSomethingAction:', error)
    throw new Error('Failed to do something') // Let client handle
  }
}
```

### Context Provider Pattern
See `/context/data-provider.tsx` (1350 lines) for master pattern:
- Combines multiple Zustand stores
- Manages complex state (accounts, trades, groups, tags)
- Provides unified API for dashboard components
- Handles real-time Supabase subscriptions

## Testing & Debugging

### MAE/MFE Testing
```bash
# Test with mock data
curl http://localhost:3000/api/test-mae-mfe

# Test with real Databento data
curl http://localhost:3000/api/test-mae-mfe?real=true&symbol=ES
```

### Database Inspection
```bash
bunx prisma studio  # Visual database browser on localhost:5555
```

### Trade Import Debugging
- Check `/scripts/tradovate-debug.ts` for Tradovate sync issues
- See `/scripts/TRADOVATE_DEBUG_README.md` for detailed guide

## Performance Considerations

- **Minimize client bundles**: Use dynamic imports for heavy components
- **Cache revalidation**: Call `revalidateCache(tags)` after mutations in `server/database.ts`
- **Batch operations**: Group database queries (see `calculateAccountBalanceAction` - single query for all accounts)
- **Avoid N+1**: Pre-fetch related data with Prisma `include` or separate queries, never loop over individual fetches

## Documentation References

- **Journal Editor Features**: `/docs/JOURNAL_EDITOR.md` - TipTap editor with resizable images and tables
- **WARP Guide**: `/WARP.md` - Comprehensive architecture, commands, and specialized features (MAE/MFE, multi-tenant)
- **README**: Detailed setup, features, tech stack, and roadmap

## Quick Reference

**Package Manager**: Bun preferred (faster), npm works  
**Dev Server**: `bun dev` or `npm run dev`  
**Build**: `bun run build`  
**Lint**: `bun run lint`  
**Database**: PostgreSQL via Supabase (remote) or local  
**Environment**: See `.env.example` for required variables

---

**Remember**: This is a trading analytics platform - data accuracy is critical. Always validate calculations, test edge cases, and maintain consistency between server/client computed values.
