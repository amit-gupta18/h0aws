import Sidebar from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center border-b border-border p-4 md:hidden">
          <MobileNav />
          <div className="ml-4 font-bold text-primary">Rakhat</div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
