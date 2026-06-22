'use client'

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/Sidebar"

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle Sidebar</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-56 flex flex-col">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <Sidebar className="w-full border-r-0" />
      </SheetContent>
    </Sheet>
  )
}
