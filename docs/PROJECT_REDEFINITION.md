# GastroPOS Redefinition (v1)

## Objective
Build a stable, fast, and modern SaaS POS for cafes/pastry shops with multi-tenant isolation and offline-friendly checkout.

## Architecture Decisions
- Frontend framework: Next.js App Router + TypeScript strict + TailwindCSS.
- UI architecture: modular by domain (`src/modules/*`), not by file type.
- State: Zustand with persisted slices for cart and sales queue.
- Data backend: Supabase Postgres with RLS; all business tables include `tenant_id`.
- Offline-first baseline: cart/sales persisted locally, sync-ready sale model (`sync_status` planned).

## Target Folder Structure
```txt
src/
  app/
    page.tsx
    pos/page.tsx
    ventas/page.tsx
  modules/
    core/
      ui/
    pos/
      domain/
      store/
      ui/
      lib/
database/
  schema.sql
docs/
  PROJECT_REDEFINITION.md
```

## Stability Rules
- Strict TypeScript, no `any`.
- Deterministic price calculations from immutable cart lines.
- Cart line identity = `product + selected modifiers` signature.
- No direct mutation of persisted state.

## Performance Rules
- Keep catalog static in-memory for MVP.
- Minimize rerenders with selector-based Zustand usage.
- Avoid heavy dependencies in client routes.

## UX/Visual Rules
- Light mode first.
- Large tap targets for touchscreen POS.
- Clear visual hierarchy: catalog left, ticket right.
- Fast actions with minimal modal depth.

## Delivery Phases
1. Multi-tenant DB schema + RLS.
2. Modular POS UI + cart with modifiers.
3. Sales history and shift summary.
4. Sync engine (local queue -> Supabase) and conflict strategy.

## Runtime Config
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If env vars are missing, app runs in local mode and keeps sales pending in local storage.

## Multi-tenant Sync Requirements
- User must have an active Supabase session.
- `app_user` must contain a row with:
  - `id = auth.users.id`
  - valid `tenant_id`
  - role (`admin` or `cashier`)
- Sales sync writes `tenant_id` and `cashier_user_id` into `order` and `order_item`.
- Shift close sync writes `tenant_id` and `cashier_user_id` into `cash_shift_close`.

## Migrations
- Incremental SQL migration:
  - `database/migrations/2026-02-26_shift_close_and_client_line.sql`
  - `database/migrations/2026-02-27_cash_lifecycle.sql`

## Reporting
- Sales dashboard supports date/time filtering (`today`, `7d`, `30d`, `custom`, `all`).
- CSV export available for filtered sales and shift closes.
- Printable report layout for browser `Print to PDF` export.

## Sync Conflict Strategy
- Exponential backoff retries for sales and inventory sync loops.
- Terminal errors (RLS/auth/FK/UUID) are marked as non-retryable to avoid infinite loops.
- Pending queue keeps only retryable records under retry limit.
- Shift close events are queued and synced in background with the same policy.
- Cash movement events are queued and synced in background with the same policy.

## Cash Lifecycle MVP
- Shift opening with base cash amount.
- Manual cash movements with audit fields (`in`/`out`, amount, reason, timestamp).
- Shift close summary includes expected cash (`opening + cash sales + in - out`).
- Remote sync persists shift close and manual movements.

## Weighable Sales MVP
- Product model includes `isWeighable` in catalog admin.
- POS supports decimal quantity for weighable products (kg input).
- Cart quantity controls use decimal steps for weighable lines.
- Stock validation and inventory deduction use decimal quantities.

## Bundles/Combos MVP
- Catalog supports bundle products (`kind = bundle`) with configurable component list.
- POS computes combo availability from component stock (not combo stock rows).
- Sale close deducts inventory from bundle components automatically.
- Cart displays combo composition for cashier visibility.

## Pre-orders MVP
- `pre_order` table with tenant isolation, due date, deposit, remaining balance, and status lifecycle.
- Route `/ventas` includes pre-order creation form (customer, due date, total, deposit, note).
- Pre-order statuses supported: `scheduled`, `ready`, `delivered`, `cancelled`.
- Pre-orders sync in background with the same retry/terminal-error strategy as other queues.

## Recipes / Escandallo MVP
- Catalog products support `recipeItems` (ingredient product + quantity consumption).
- POS stock validation considers recipe ingredient availability before adding/selling.
- Sale stock deduction uses recipe ingredients when configured (instead of finished product stock).
- Ingredient products can be hidden from POS via `availableInPos = false` and still tracked in inventory.

## Tables + KDS MVP
- Route `/mesas` with table map and live state from active dining orders.
- POS can send cart to kitchen as dining order linked to a table (`sendCartToKitchen`).
- Route `/kds` shows active kitchen orders and supports status flow (`sent`, `preparing`, `ready`, `served`, `cancelled`).
- Table operations include transfer order to another table and merge two active orders.

## Delivery / Logistics MVP
- Route `/delivery` with courier roster and active/inactive toggles.
- Delivery order lifecycle with state machine: `pending` -> `assigned` -> `picked_up` -> `delivered` (or `cancelled`).
- Source channel support (`manual`, `pedidosya`, `rappi`, `ubereats`, `qr`) for aggregator-ready workflows.
- Delivery orders sync in background to Supabase table `delivery_order`.

## Inventory MVP
- Route: `/inventario`
- Local persisted stock by product.
- Low stock alerts (`currentStock <= minStock`).
- Quick stock adjustments and minimum threshold tuning.
- POS integration: stock is validated before adding/cobrando and decremented automatically on successful sale.
- Inventory movement log includes manual edits, sale deductions, and reset operations.
- Inventory movements sync to Supabase (`inventory_movement`) and maintain remote stock snapshot (`inventory_stock`).
- Inventory reset creates per-product delta movements (audit-friendly and sync-safe).

## Catalog Admin
- Route: `/catalogo`
- CRUD for products.
- CRUD for modifier groups and modifiers.
- POS reads catalog from persisted store instead of hardcoded constants.
- Inventory reconciles product list when catalog changes.

## Missing Blocks (from `docs/proyecto completo.md`)
None for the MVP roadmap. Multi-branch + fiscal integrations are now implemented:
- Branch model with active branch context in POS/ventas/pre-orders/delivery.
- Branch-aware pricing in POS and catalog admin (`branchPrices` overrides).
- Fiscal invoice queue + sync adapter (provider-aware, mocked issuance payload).
- Supabase migration for `branch` + `fiscal_invoice` + `branch_id` references.

## Post-MVP Expansion Candidates (from initial analysis doc)
- Pizza fractions (`mitad/mitad`) pricing rules.
- Coursing / timed firing for kitchen (`entradas`, `principales`, `postres`).
- Native mobile app for waiters/owners (React Native/Expo).
- Catalog/inventory centralization API for true corporate multi-branch governance.
