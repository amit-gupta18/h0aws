'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Receipt,
  Users,
  Box,
  Wallet,
  BarChart,
} from 'lucide-react'
import { sidebarItems } from '@/config/sidebar'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ReactNode> = {
  receipt: <Receipt size={18} />,
  users: <Users size={18} />,
  box: <Box size={18} />,
  wallet: <Wallet size={18} />,
  'bar-chart': <BarChart size={18} />,
}

export default function Sidebar() {
  const role = useAuthStore((s) => s.role)
  const pathname = usePathname()

  if (!role) return null

  const visibleItems = sidebarItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="flex flex-col gap-1 w-56 shrink-0 py-6 px-3 border-r border-border h-full">
      {visibleItems.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {iconMap[item.icon]}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
