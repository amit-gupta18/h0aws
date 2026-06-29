export function TableShell({
  children,
  empty,
  emptyMsg,
}: {
  children: React.ReactNode
  empty: boolean
  emptyMsg: string
}) {
  if (empty) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">
        {emptyMsg}
      </div>
    )
  }
  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">{children}</table>
    </div>
  )
}
