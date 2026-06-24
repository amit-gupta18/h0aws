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
      <SheetContent side="left" className="flex h-full w-56 flex-col overflow-hidden p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <Sidebar className="h-full w-full overflow-y-auto border-r-0" forceShow />
      </SheetContent>
    </Sheet>
  )
}
