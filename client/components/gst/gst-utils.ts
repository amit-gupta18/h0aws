export function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)
}

export const TH =
  'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50'
export const TD = 'px-4 py-3'
export const TR = 'border-t border-border'

export function currentFyStartYear(date = new Date()) {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return month >= 4 ? year : year - 1
}
