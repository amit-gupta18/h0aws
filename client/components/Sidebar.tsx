'use client'

import { useState } from 'react'
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
  ChevronRight,
  Settings,
  Banknote,
} from 'lucide-react'
import { sidebarItems, type SidebarItem } from '@/config/sidebar'
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
  banknote: <Banknote size={18} />,
  'user-plus': <UserPlus size={18} />,
  settings: <Settings size={18} />,
}

function NavItem({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const router = useRouter()
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname.startsWith(item.href)
  const [expanded, setExpanded] = useState(isActive)

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
    } else {
      router.push(item.href)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive && !hasChildren
            ? 'bg-primary text-primary-foreground'
            : isActive
              ? 'text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <ChevronRight
          size={14}
          className={cn('transition-transform', expanded && 'rotate-90')}
        />
        {iconMap[item.icon]}
        {item.label}
      </button>
      {hasChildren && expanded && (
        <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-border pl-3">
          {item.children!.map((child) => {
            const childActive = pathname.startsWith(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  childActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SidebarSkeleton({ className, forceShow = false }: { className?: string; forceShow?: boolean }) {
  const navItemCount = 6

  return (
    <nav className={cn(
      "flex-col w-56 shrink-0 border-r border-border h-full bg-sidebar",
      forceShow ? "flex" : "hidden md:flex",
      className
    )}>
      {/* Business header skeleton */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div
          className="h-3 w-16 bg-muted rounded animate-pulse"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="h-4 w-28 bg-muted rounded mt-2 animate-pulse"
          style={{ animationDelay: '50ms' }}
        />
      </div>

      {/* Nav items skeleton */}
      <div className="flex flex-col gap-1 flex-1 py-4 px-3">
        {Array.from({ length: navItemCount }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md px-3 py-2 animate-pulse"
            style={{ animationDelay: `${100 + i * 75}ms` }}
          >
            <div className="h-[18px] w-[18px] bg-muted rounded" />
            <div className="h-4 bg-muted rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
          </div>
        ))}
      </div>

      {/* Logout button skeleton */}
      <div className="mt-auto px-3 pb-4">
        <div
          className="flex items-center gap-3 rounded-md px-3 py-2 animate-pulse"
          style={{ animationDelay: `${100 + navItemCount * 75}ms` }}
        >
          <div className="h-[18px] w-[18px] bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
      </div>
    </nav>
  )
}

export default function Sidebar({ className, forceShow = false }: { className?: string; forceShow?: boolean }) {
  const role = useActiveRole()
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const pathname = usePathname()
  const router = useRouter()

  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const storeMemberships = useAuthStore((s) => s.memberships)
  const setActiveBusiness = useAuthStore((s) => s.setActiveBusiness)

  const { data: bizData } = useBusinesses()
  const memberships = bizData?.memberships ?? storeMemberships

  const logout = useLogout()

  if (!isHydrated || !role) return <SidebarSkeleton className={className} forceShow={forceShow} />

  const visibleItems = sidebarItems.filter((item) => item.roles.includes(role))
  const activeBusiness = memberships.find((m) => m.businessId === activeBusinessId)

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    })
  }

  return (
    <nav className={cn(
      "flex-col w-56 shrink-0 border-r border-border h-full bg-sidebar",
      forceShow ? "flex" : "hidden md:flex",
      className
    )}>
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
        {visibleItems.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="mt-auto px-3 pb-4">
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
