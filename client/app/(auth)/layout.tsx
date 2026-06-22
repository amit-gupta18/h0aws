import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 border-b border-border/50">
        <Link href="/" className="text-primary font-bold text-lg tracking-tight">
          Rakhat
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </div>
      <footer className="px-5 py-4 text-center text-xs text-muted-foreground border-t border-border/50">
        GST billing for Indian SMBs
      </footer>
    </div>
  )
}
