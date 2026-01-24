"use client"

import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-purple-100 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button className="mr-4 text-gray-500 md:hidden">
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Search - Hidden on small mobile */}
        <div className="hidden relative sm:block w-full max-w-md">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
           <Input 
              placeholder="Search..." 
              className="pl-9 w-[300px] bg-gray-50 border-transparent focus:bg-white focus:border-purple-200" 
           />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-purple-600">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>
      </div>
    </header>
  );
}
