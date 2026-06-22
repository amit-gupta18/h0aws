'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Receipt,
  Users,
  Box,
  Wallet,
  BarChart,
  UserPlus,
  LogOut,
  Building2,
} from 'lucide-react'
import { sidebarItems } from '@/config/sidebar'
import { useActiveRole, useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useBusinesses } from '@/hooks/useBusinesses'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ReactNode> = {
  receipt: <Receipt size={18} />,
  users: <Users size={18} />,
  box: <Box size={18} />,
  wallet: <Wallet size={18} />,
  'bar-chart': <BarChart size={18} />,
  'user-plus': <UserPlus size={18} />,
}

export default function Sidebar({ className }: { className?: string }) {
  const role = useActiveRole()
  const pathname = usePathname()
  const router = useRouter()

  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const storeMemberships = useAuthStore((s) => s.memberships)
  const setActiveBusiness = useAuthStore((s) => s.setActiveBusiness)

  const { data: bizData } = useBusinesses()
  const memberships = bizData?.memberships ?? storeMemberships

  const logout = useLogout()

  if (!role) return null

  const visibleItems = sidebarItems.filter((item) => item.roles.includes(role))
  const activeBusiness = memberships.find((m) => m.businessId === activeBusinessId)

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    })
  }

  return (
    <nav className={cn("hidden md:flex flex-col w-56 shrink-0 border-r border-border h-full bg-sidebar", className)}>
      {memberships.length > 1 && (
        <div className="px-3 pt-4 pb-2 border-b border-border space-y-1">
          <p className="text-xs text-muted-foreground px-2 mb-1 flex items-center gap-1">
            <Building2 size={12} /> Business
          </p>
          {memberships.map((m) => (
            <button
              key={m.businessId}
              onClick={() => setActiveBusiness(m.businessId)}
              className={cn(
                'w-full text-left rounded-md px-3 py-1.5 text-xs font-medium truncate transition-colors',
                m.businessId === activeBusinessId
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {m.tradeName}
            </button>
          ))}
        </div>
      )}

      {memberships.length === 1 && activeBusiness && (
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <Building2 size={12} /> Business
          </p>
          <p className="text-sm font-medium text-foreground truncate">{activeBusiness.tradeName}</p>
        </div>
      )}

      <div className="flex flex-col gap-1 flex-1 py-4 px-3">
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
      </div>

      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          disabled={logout.isPending}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </nav>
  )
}
