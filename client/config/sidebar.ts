import type { Role } from '@/shared/types'

export type SidebarSubItem = {
  label: string
  href: string
}

export type SidebarItem = {
  label: string
  href: string
  icon: string
  roles: Role[]
  children?: SidebarSubItem[]
}

export const sidebarItems: SidebarItem[] = [
  {
    label: 'Sales',
    href: '/dashboard/sales',
    icon: 'receipt',
    roles: ['OWNER', 'ACCOUNTANT'],
    children: [
      { label: 'Invoices', href: '/dashboard/sales/invoices' },
    ],
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
    label: 'Expenses',
    href: '/dashboard/expenses',
    icon: 'banknote',
    roles: ['OWNER', 'ACCOUNTANT'],
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
  {
    label: 'Team',
    href: '/dashboard/team',
    icon: 'user-plus',
    roles: ['OWNER'],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'settings',
    roles: ['OWNER', 'ACCOUNTANT', 'VIEWER'],
  },
]
