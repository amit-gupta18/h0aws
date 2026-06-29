'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  FileCheck,
} from 'lucide-react'
import { sidebarItems, type SidebarItem, type SidebarSubItem } from '@/config/sidebar'
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
  'file-check': <FileCheck size={18} />,
  'user-plus': <UserPlus size={18} />,
  settings: <Settings size={18} />,
}

function parseHref(href: string) {
  const [path, query = ''] = href.split('?')
  return { path, params: new URLSearchParams(query) }
}

function isChildActive(
  pathname: string,
  searchParams: URLSearchParams,
  child: SidebarSubItem,
  siblings: SidebarSubItem[]
) {
  const { path, params } = parseHref(child.href)

  if ([...params.keys()].length > 0) {
    if (!pathname.startsWith(path)) return false
    for (const [key, value] of params.entries()) {
      if (searchParams.get(key) !== value) return false
    }
    return true
  }

  if (pathname === path) {
    if (path === '/dashboard/gst' && searchParams.get('tab')) return false
    if (path === '/dashboard/inventory' && searchParams.get('tab')) return false
    return true
  }

  // Another sibling is an exact or prefix match — prefer it over this list route
  const siblingMatches = siblings.some((s) => {
    if (s.href === child.href) return false
    const siblingPath = parseHref(s.href).path
    return pathname === siblingPath || pathname.startsWith(`${siblingPath}/`)
  })
  if (siblingMatches) return false

  // List child stays active on detail sub-routes (e.g. /invoices/[id])
  if (pathname.startsWith(`${path}/`)) return true

  return false
}

function isGroupActive(pathname: string, item: SidebarItem) {
  return pathname.startsWith(item.href)
}

function NavItem({
  item,
  pathname,
  searchParams,
}: {
  item: SidebarItem
  pathname: string
  searchParams: URLSearchParams
}) {
  const groupActive = isGroupActive(pathname, item)
  const childActive = item.children.some((c) =>
    isChildActive(pathname, searchParams, c, item.children)
  )
  const [expanded, setExpanded] = useState(groupActive || childActive)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          groupActive || childActive ? 'bg-muted/60' : 'hover:bg-muted'
        )}
      >
        <ChevronRight
          size={14}
          className={cn('shrink-0 transition-transform text-muted-foreground', expanded && 'rotate-90')}
        />
        <span className="shrink-0 text-foreground">{iconMap[item.icon]}</span>
        <span className="truncate font-medium text-foreground">{item.label}</span>
      </button>
      {expanded && (
        <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children.map((child) => {
            const active = isChildActive(pathname, searchParams, child, item.children)
            return (
              <Link
                key={child.href + child.label}
                href={child.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
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
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-28 bg-muted rounded mt-2 animate-pulse" />
      </div>
      <div className="flex flex-col gap-1 flex-1 py-4 px-3">
        {Array.from({ length: navItemCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2 animate-pulse">
            <div className="h-[18px] w-[18px] bg-muted rounded" />
            <div className="h-4 bg-muted rounded flex-1" />
          </div>
        ))}
      </div>
    </nav>
  )
}

export default function Sidebar({ className, forceShow = false }: { className?: string; forceShow?: boolean }) {
  const role = useActiveRole()
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const pathname = usePathname()
  const searchParams = useSearchParams()
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

      <div className="flex flex-col gap-1 flex-1 py-4 px-3 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            pathname={pathname}
            searchParams={searchParams}
          />
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
