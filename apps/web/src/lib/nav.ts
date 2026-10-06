/** Main navigation, from the MVP spec §33. `phase` is the build phase from spec §37. */
export interface NavItem {
  label: string;
  href: string;
  phase: number;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const DASHBOARD: NavItem = { label: 'Dashboard', href: '/', phase: 7 };

export const NAV: NavGroup[] = [
  {
    label: 'Sales',
    items: [
      { label: 'Orders', href: '/orders', phase: 2 },
      { label: 'Customers', href: '/customers', phase: 1 },
      { label: 'Products', href: '/products', phase: 2 },
      { label: 'Payments', href: '/payments', phase: 2 },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', href: '/inventory', phase: 4 },
      { label: 'Materials', href: '/materials', phase: 1 },
      { label: 'Categories', href: '/categories', phase: 1 },
      { label: 'Purchase requests', href: '/purchase-requests', phase: 4 },
      { label: 'Suppliers', href: '/suppliers', phase: 1 },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Design', href: '/production/design', phase: 3 },
      { label: 'Printing', href: '/production/printing', phase: 4 },
      { label: 'Heat press', href: '/production/heat-press', phase: 4 },
      { label: 'Sewing', href: '/production/sewing', phase: 4 },
      { label: 'Packaging', href: '/production/packaging', phase: 4 },
      { label: 'Ready for pickup', href: '/production/ready', phase: 4 },
      { label: 'Machines', href: '/machines', phase: 6 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expenses', href: '/expenses', phase: 7 },
      { label: 'Costing', href: '/costing', phase: 6 },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales', href: '/reports/sales', phase: 7 },
      { label: 'Inventory', href: '/reports/inventory', phase: 7 },
      { label: 'Production', href: '/reports/production', phase: 7 },
      { label: 'Order profitability', href: '/reports/profitability', phase: 7 },
      { label: 'Expenses', href: '/reports/expenses', phase: 7 },
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
