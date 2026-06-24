'use client'

import Sidebar from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-full h-[100dvh] w-full flex-col md:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="flex shrink-0 items-center border-b border-border px-3 py-3 md:hidden">
            <MobileNav />
            <div className="ml-3 min-w-0 truncate font-bold text-primary">Rakhat</div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
