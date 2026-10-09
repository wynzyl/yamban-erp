import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  Cog,
  CreditCard,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Package,
  PackageCheck,
  Palette,
  Printer,
  Receipt,
  Scissors,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';

/** Main navigation, from the MVP spec §33. `phase` is the build phase from spec §37. */
export interface NavItem {
  label: string;
  href: string;
  phase: number;
  icon: LucideIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const DASHBOARD: NavItem = { label: 'Dashboard', href: '/', phase: 7, icon: LayoutDashboard };

export const NAV: NavGroup[] = [
  {
    label: 'Sales',
    items: [
      { label: 'Orders', href: '/orders', phase: 2, icon: ShoppingCart },
      { label: 'Customers', href: '/customers', phase: 1, icon: Users },
      { label: 'Products', href: '/products', phase: 2, icon: Package },
      { label: 'Payments', href: '/payments', phase: 2, icon: CreditCard },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', href: '/inventory', phase: 4, icon: Warehouse },
      { label: 'Materials', href: '/materials', phase: 1, icon: Layers },
      { label: 'Categories', href: '/categories', phase: 1, icon: FolderKanban },
      { label: 'Purchase requests', href: '/purchase-requests', phase: 4, icon: ClipboardList },
      { label: 'Suppliers', href: '/suppliers', phase: 1, icon: Truck },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Design', href: '/production/design', phase: 3, icon: Palette },
      { label: 'Printing', href: '/production/printing', phase: 4, icon: Printer },
      { label: 'Heat press', href: '/production/heat-press', phase: 4, icon: Sparkles },
      { label: 'Sewing', href: '/production/sewing', phase: 4, icon: Scissors },
      { label: 'Packaging', href: '/production/packaging', phase: 4, icon: Boxes },
      { label: 'Ready for pickup', href: '/production/ready', phase: 4, icon: PackageCheck },
      { label: 'Machines', href: '/machines', phase: 6, icon: Cog },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expenses', href: '/expenses', phase: 7, icon: Receipt },
      { label: 'Costing', href: '/costing', phase: 6, icon: Calculator },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales', href: '/reports/sales', phase: 7, icon: BarChart3 },
      { label: 'Inventory', href: '/reports/inventory', phase: 7, icon: BarChart3 },
      { label: 'Production', href: '/reports/production', phase: 7, icon: BarChart3 },
      { label: 'Order profitability', href: '/reports/profitability', phase: 7, icon: BarChart3 },
      { label: 'Expenses', href: '/reports/expenses', phase: 7, icon: BarChart3 },
    ],
  },
];

export function findNavItem(href: string): (NavItem & { group: string }) | undefined {
  for (const g of NAV) {
    const item = g.items.find((i) => i.href === href);
    if (item) return { ...item, group: g.label };
  }
  return undefined;
}
