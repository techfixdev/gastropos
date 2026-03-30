# Multi-Device Audit

## Scope
Review of GastroPOS readiness for multi-device usage across:
- mobile cashier/tablet/desktop layouts
- shared operational state across browsers/devices
- data model implications

## Frontend Findings
- Main layout is now responsive at mobile, tablet, and desktop widths.
- Header action groups needed wrapping because module navigation overflowed on narrow screens.
- Button sizing needed normalization because some actions were visually heavier than others.
- Dense POS/admin screens still rely on many local controls in a single viewport, so tablet is the best operational target for backoffice screens.

## Current Multi-Device Data Reality
The app is not yet fully multi-device in behavior even though remote sync exists for transactional entities.

### Already remote-backed or sync-ready
- sales
- shift closes
- cash movements
- pre-orders
- delivery orders
- branches
- fiscal invoices
- inventory movements / stock snapshots

### Still local-first in practice
- catalog products and modifier groups are persisted in browser storage
- cart state is browser-local
- dining orders / KDS state are browser-local
- courier roster is browser-local
- branch price overrides are browser-local because catalog is local

## Consequence
If two devices open the same tenant:
- both can see synced transactional history only after remote sync
- they do not share live catalog edits reliably
- they do not share live KDS / dining state reliably
- courier lists and some backoffice data can diverge by device

## Recommended Database Roadmap For True Multi-Device
1. Move catalog master data to Supabase tables:
- `product`
- `modifier_group`
- `modifier`
- `product_modifier_group`

2. Add branch-aware price table:
- `product_branch_price`
  - `tenant_id`
  - `product_id`
  - `branch_id`
  - `price`

3. Move live operational entities to remote source of truth:
- `dining_order`
- `dining_order_item`
- optional `courier`

4. Add device/session observability:
- `pos_device`
  - device name
  - branch
  - last_seen_at
  - app version

5. Separate draft/local state from shared state:
- cart remains local by device
- confirmed orders, KDS, and inventory become remote canonical state

## Recommended Product Strategy
Short term:
- keep cart local
- keep responsive UI improvements
- avoid cross-device cart sharing

Next backend block:
- remote catalog + branch prices
- remote dining/KDS
- remote courier roster

After that:
- realtime subscriptions for KDS and tables
- per-device session monitoring

## Responsive Design Notes
- POS works best on tablet landscape and desktop.
- Mobile works for quick checks and lightweight actions, but high-density cashier flow is still operationally better on tablet.
- Backoffice modules are responsive, but should be treated as mobile-compatible rather than mobile-optimized.
