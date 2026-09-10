"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { NotificationsDrawer } from "./notifications-drawer";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // If on auth pages (/signin, /signup), don't show the dashboard chrome
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  if (isAuthPage) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Collapsible Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          collapsed ? "md:pl-18" : "md:pl-64"
        )}
      >
        <Topbar
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in-50 duration-200">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
      />

      {/* Global Alerts & Notifications Drawer */}
      <NotificationsDrawer />
    </div>
  );
}
