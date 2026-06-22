import type { Role } from '@/shared/types'

export type SidebarItem = {
  label: string
  href: string
  icon: string
  roles: Role[]
}

export const sidebarItems: SidebarItem[] = [
  {
    label: 'Sales',
    href: '/dashboard/sales/invoices',
    icon: 'receipt',
    roles: ['OWNER', 'ACCOUNTANT'],
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: 'users',
    roles: ['OWNER', 'ACCOUNTANT'],
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: 'box',
    roles: ['OWNER', 'ACCOUNTANT', 'VIEWER'],
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: 'wallet',
    roles: ['OWNER', 'ACCOUNTANT'],
  },
  {
    label: 'Insights',
    href: '/dashboard/insights',
    icon: 'bar-chart',
    roles: ['OWNER'],
  },
]
