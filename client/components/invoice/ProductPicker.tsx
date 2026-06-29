'use client'

import { useState, useDeferredValue, useRef, useEffect, useCallback } from 'react'
import { useInfiniteProducts, type Product } from '@/hooks/useProducts'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Loader2, Search } from 'lucide-react'

type ProductPickerProps = {
  value: string
  active: boolean
  inventoryTracking: boolean
  onFocus: () => void
  onChange: (name: string) => void
  onSelect: (product: Product) => void
}

export function ProductPicker({
  value,
  active,
  inventoryTracking,
  onFocus,
  onChange,
  onSelect,
}: ProductPickerProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseQuery, setBrowseQuery] = useState('')
  const deferredBrowseQuery = useDeferredValue(browseQuery)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const browseListRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteProducts(
    deferredQuery,
    active && dropdownOpen && !!deferredQuery
  )

  const {
    data: browseData,
    isLoading: browseLoading,
    isFetchingNextPage: browseFetchingNext,
    hasNextPage: browseHasNext,
    fetchNextPage: browseFetchNext,
  } = useInfiniteProducts(deferredBrowseQuery, browseOpen)

  const products = data?.pages.flatMap((p) => p.data) ?? []
  const browseProducts = browseData?.pages.flatMap((p) => p.data) ?? []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDropdownScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleBrowseScroll = useCallback(() => {
    const el = browseListRef.current
    if (!el || !browseHasNext || browseFetchingNext) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      browseFetchNext()
    }
  }, [browseHasNext, browseFetchingNext, browseFetchNext])

  const pickProduct = (product: Product) => {
    onSelect(product)
    setQuery('')
    setDropdownOpen(false)
    setBrowseOpen(false)
  }

  const displayValue = active ? query || value : value

  return (
    <>
      <div ref={containerRef} className="flex gap-1">
        <div className="relative min-w-0 flex-1">
          <input
            className="w-full min-w-[120px] rounded border bg-background px-2 py-1 text-sm"
            placeholder="Search or type name"
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value)
              onChange(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => {
              onFocus()
              setDropdownOpen(true)
            }}
          />
          {active && dropdownOpen && deferredQuery && (
            <div
              ref={listRef}
              onScroll={handleDropdownScroll}
              className="absolute z-20 mt-1 max-h-48 w-full min-w-[220px] overflow-auto rounded-md border bg-background shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Searching...
                </div>
              ) : products.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No products found</div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => pickProduct(product)}
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {product.hsnCode ? `HSN: ${product.hsnCode} | ` : ''}
                      ₹{product.sellingPrice.toFixed(2)} | GST: {product.gstRate}%
                      {inventoryTracking && ` | Stock: ${product.quantity}`}
                    </div>
                  </button>
                ))
              )}
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 px-2 text-xs"
          onClick={() => {
            onFocus()
            setBrowseOpen(true)
          }}
        >
          Browse
        </Button>
      </div>

      <Sheet open={browseOpen} onOpenChange={setBrowseOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Browse Inventory</SheetTitle>
            <SheetDescription>Select a product to add to this line item</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3 px-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <input
                className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
                placeholder="Search products..."
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div
              ref={browseListRef}
              onScroll={handleBrowseScroll}
              className="max-h-[calc(100vh-12rem)] overflow-auto rounded-md border"
            >
              {browseLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : browseProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No products in inventory
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      {inventoryTracking && (
                        <th className="px-3 py-2 text-right font-medium">Stock</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {browseProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => pickProduct(product)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {product.hsnCode ? `HSN ${product.hsnCode}` : product.unit}
                            {' · '}
                            GST {product.gstRate}%
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ₹{product.sellingPrice.toFixed(2)}
                        </td>
                        {inventoryTracking && (
                          <td className="px-3 py-2 text-right">{product.quantity}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {browseFetchingNext && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export type { Product as PickerProduct }
