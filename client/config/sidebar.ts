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
  children: SidebarSubItem[]
}

export const sidebarItems: SidebarItem[] = [
  {
    label: 'Sales',
    href: '/dashboard/sales',
    icon: 'receipt',
    roles: ['OWNER', 'ACCOUNTANT'],
    children: [
      { label: 'All invoices', href: '/dashboard/sales/invoices' },
      { label: 'Create invoice', href: '/dashboard/sales/invoices/new' },
    ],
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: 'users',
    roles: ['OWNER', 'ACCOUNTANT'],
    children: [
      { label: 'Customer directory', href: '/dashboard/customers' },
    ],
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: 'box',
    roles: ['OWNER', 'ACCOUNTANT', 'VIEWER'],
    children: [
      { label: 'Products', href: '/dashboard/inventory' },
      { label: 'Stock history', href: '/dashboard/inventory?tab=history' },
    ],
  },
  {
    label: 'Expenses',
    href: '/dashboard/expenses',
    icon: 'banknote',
    roles: ['OWNER', 'ACCOUNTANT'],
    children: [
      { label: 'All expenses', href: '/dashboard/expenses' },
    ],
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: 'wallet',
    roles: ['OWNER', 'ACCOUNTANT'],
    children: [
      { label: 'Outstanding & reminders', href: '/dashboard/payments' },
    ],
  },
  {
    label: 'Insights',
    href: '/dashboard/insights',
    icon: 'bar-chart',
    roles: ['OWNER'],
    children: [
      { label: 'Revenue & P&L', href: '/dashboard/insights' },
    ],
  },
  {
    label: 'GST',
    href: '/dashboard/gst',
    icon: 'file-check',
    roles: ['OWNER'],
    children: [
      { label: 'GST Intelligence', href: '/dashboard/gst' },
      { label: 'GSTR-1 summary', href: '/dashboard/gst?tab=gstr1' },
      { label: 'Reconciliation', href: '/dashboard/gst?tab=reconciliation' },
      { label: 'Bill OCR', href: '/dashboard/gst?tab=automation' },
      { label: 'ITR package', href: '/dashboard/gst?tab=itr' },
    ],
  },
  {
    label: 'Team',
    href: '/dashboard/team',
    icon: 'user-plus',
    roles: ['OWNER'],
    children: [
      { label: 'Members & roles', href: '/dashboard/team' },
    ],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'settings',
    roles: ['OWNER', 'ACCOUNTANT', 'VIEWER'],
    children: [
      { label: 'Business profile', href: '/dashboard/settings' },
    ],
  },
]
