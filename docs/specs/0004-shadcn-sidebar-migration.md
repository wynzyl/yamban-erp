# 0004. Migrate sidebar to shadcn sidebar primitives

**Date**: 2026-10-09
**Status**: In Progress

## Summary

This spec covers replacing the custom sidebar in `app-shell.tsx` with the newly installed shadcn sidebar primitives. The new sidebar will support collapsing to an icon only rail on desktop, persist its state via cookie, show icons alongside nav labels, and allow collapsible nav groups. The change improves user experience by maximizing content area while keeping navigation accessible.

## Context

The current sidebar implementation in `components/app-shell.tsx` is a custom build using basic React state and CSS. It works but lacks features that shadcn's sidebar component provides out of the box: collapsible rail mode, keyboard shortcuts, cookie persistence, tooltip support when collapsed, and mobile sheet integration.

The shadcn sidebar component was just installed (`npx shadcn@latest add sidebar`), adding `sidebar.tsx` with a full suite of primitives: `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, and more. It also added supporting components (Sheet, Tooltip, Skeleton, Separator) and new CSS variables to `globals.css`.

The migration must preserve all existing functionality: grouped navigation from `lib/nav.ts`, user footer with theme toggle and sign out, brand mark, and mobile responsive behavior.

## Requirements

**User stories**:
- As a user, I want to collapse the sidebar to icons only so I have more screen space for content.
- As a user, I want the sidebar to remember my preference so I don't have to toggle it every session.
- As a user, I want to see icons on nav items so I can quickly identify sections even when collapsed.

**Acceptance criteria**:
- **AC-1**: Sidebar uses shadcn sidebar primitives (`SidebarProvider`, `Sidebar`, `SidebarContent`, etc.) instead of custom implementation
- **AC-2**: Sidebar collapses to icon only rail on desktop via toggle button in header
- **AC-3**: Collapsed/expanded state persists via cookie across sessions (7 day expiry, built into shadcn)
- **AC-4**: Each nav item displays a lucide icon alongside its text label
- **AC-5**: Nav groups (Sales, Inventory, Production, Finance, Reports) are collapsible/expandable
- **AC-6**: Group containing the current active route auto expands when navigating
- **AC-7**: Group collapse state resets on navigation (not persisted)
- **AC-8**: Sidebar CSS variables (--sidebar-*) mapped to existing design tokens
- **AC-9**: Mobile behavior shows sidebar in sheet/overlay (shadcn Sheet component)
- **AC-10**: User footer preserved: name, email, theme toggle, sign out button
- **AC-11**: Keyboard shortcut Ctrl/Cmd+B toggles sidebar (built into shadcn)
- **AC-12**: Brand mark displayed in sidebar header
- **AC-13**: Tooltips show nav item labels on hover when sidebar is collapsed

## Options considered

### Option 1: Minimal migration (reuse existing structure)

Wrap the existing `app-shell.tsx` sidebar content with shadcn's `SidebarProvider` and `Sidebar` components, keeping the same JSX structure but gaining collapse functionality.

**Pros**:
- Smallest code change
- Lower risk of regressions

**Cons**:
- Does not fully leverage shadcn's menu primitives (`SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`)
- Tooltip support requires manual wiring
- Collapsible groups need custom implementation

### Option 2: Full migration to shadcn primitives (recommended)

Create a new `app-sidebar.tsx` component using shadcn's full primitive set. Update `lib/nav.ts` to include icons. Replace the sidebar portion of `app-shell.tsx` with the new component.

**Pros**:
- Clean separation: all sidebar logic in one component
- Full access to shadcn features (tooltips, collapsible menus, keyboard shortcuts)
- Follows shadcn patterns for future maintainability
- Collapsible groups via `Collapsible` from shadcn

**Cons**:
- More code to write initially
- Need to map nav structure to shadcn menu structure

## Decision

**Chosen option**: Option 2: Full migration to shadcn primitives

The full migration provides the best long term maintainability and feature set. The extra initial work pays off in cleaner code and access to all shadcn sidebar capabilities.

## Rationale

The existing sidebar works but is custom code that must be maintained. shadcn's sidebar primitives are well tested, have accessibility built in, and provide features (collapsible rail, tooltips, keyboard shortcuts, cookie persistence) that would require significant custom code otherwise. Since we just installed the component, migrating fully makes better use of it than a half measure.

The decision to extend `nav.ts` with icon properties keeps the nav structure as the single source of truth. Icons are defined alongside routes, making it easy to add or change them. This avoids a separate icon mapping that could drift out of sync.

## Feature design

**Data model sketch**:
No database changes. The nav structure in `lib/nav.ts` adds an `icon` property:

```typescript
interface NavItem {
  label: string;
  href: string;
  phase: number;
  icon: LucideIcon;  // Added
}
```

**State transitions**:
- Sidebar: expanded ↔ collapsed (toggle via button or Ctrl/Cmd+B)
- Nav groups: expanded ↔ collapsed (toggle via group header click, auto expand on active route)

**API surface**:
No API changes. This is a frontend only enhancement.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render nav items | icon | `NavItem.icon` from `lib/nav.ts` |
| Determine active route | current pathname | `usePathname()` from Next.js |
| Persist sidebar state | cookie value | shadcn `sidebar_state` cookie |
| Display user info | name, email | `SessionUser` prop passed to component |

**Key invariants**:
- Sidebar CSS variables must map to existing design tokens (no new color definitions outside `globals.css`)
- Nav groups auto expand when containing the active route
- Mobile always uses sheet overlay, never rail mode

**Security model**:
No changes. User session handling remains the same.

**Configuration required**:
- Map `--sidebar-*` CSS variables to existing tokens in `globals.css`:
  - `--sidebar-background` → `var(--card)`
  - `--sidebar-foreground` → `var(--foreground)`
  - `--sidebar-border` → `var(--border)`
  - `--sidebar-accent` → `var(--muted)`
  - `--sidebar-accent-foreground` → `var(--foreground)`
  - `--sidebar-ring` → `var(--ring)`

**Critical test scenarios**:
- Happy path: Click toggle button, sidebar collapses to icons, refresh page, sidebar stays collapsed, verifies **AC-2**, **AC-3**
- Group behavior: Navigate to /products, Sales group auto expands if collapsed, verifies **AC-6**
- Mobile: On small screen, sidebar shows as sheet overlay with all items, verifies **AC-9**
- Keyboard: Press Ctrl+B, sidebar toggles, verifies **AC-11**

## Build plan

1. Update `lib/nav.ts`: add `icon: LucideIcon` to `NavItem` interface, assign appropriate lucide icons to each nav item (LayoutDashboard for Dashboard, ShoppingCart for Orders, Users for Customers, Package for Products, etc.), satisfies **AC-4**

2. Map sidebar CSS variables in `globals.css`: update the `--sidebar-*` variables shadcn added to reference existing design tokens, satisfies **AC-8**

3. Create `components/app-sidebar.tsx`: new component using shadcn primitives
   - `SidebarHeader` with `BrandMark` and `SidebarTrigger`, satisfies **AC-12**, **AC-2**
   - `SidebarContent` with nav groups using `Collapsible` + `SidebarGroup`, satisfies **AC-5**
   - Each nav item as `SidebarMenuItem` with `SidebarMenuButton` (icon + label), tooltip prop for collapsed state, satisfies **AC-4**, **AC-13**
   - Auto expand logic: expand group containing current route on mount, satisfies **AC-6**
   - Reset group state on route change, satisfies **AC-7**
   - `SidebarFooter` with user info, theme toggle, sign out, satisfies **AC-10**
   - Satisfies **AC-1**

4. Update `app-shell.tsx`: replace inline sidebar with `SidebarProvider` + new `AppSidebar` + `SidebarInset` for main content, satisfies **AC-1**, **AC-3**, **AC-9**, **AC-11**

5. Add `TooltipProvider` to root layout if not present (shadcn recommends this for tooltip support), satisfies **AC-13**

6. Verify `npm run check:ui` passes, satisfies all ACs

## Migration plan

**Strategy**: Replace directly (scope is small, low risk, no data migration)

**Phases**:
1. Update `nav.ts` with icons, CSS variables in `globals.css` (no visible change yet)
2. Create `app-sidebar.tsx` and update `app-shell.tsx` in one commit
3. Verify all functionality, run `check:ui`

**Rollback**: Revert the single commit; the old `app-shell.tsx` implementation is in git history.

**Risks**:
- CSS variable mapping might not match existing colors perfectly (mitigated by using token references, not hardcoded values)
- Mobile sheet behavior might differ slightly from current overlay (mitigated by testing on mobile viewport)

## Consequences

**Positive**:
- Users can collapse sidebar to maximize content area
- Sidebar state persists across sessions
- Keyboard shortcut (Ctrl/Cmd+B) for power users
- Icons improve navigation scannability
- Code follows shadcn patterns, easier to maintain

**Negative / tradeoffs**:
- Slightly more code than the minimal approach
- Dependency on shadcn sidebar component structure

**Neutral**:
- Nav structure gains icon property (minor API addition)
- New CSS variables added to globals.css (already installed by shadcn add)

## Follow-up

- [ ] Consider adding search to sidebar header for quick navigation (future enhancement)
- [ ] Consider keyboard shortcuts for nav groups (e.g., g+s for Sales) if users request
