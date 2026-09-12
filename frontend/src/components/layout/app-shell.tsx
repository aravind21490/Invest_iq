"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { NotificationsDrawer } from "./notifications-drawer";
import { useSimulator } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useSimulator();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // If on auth pages (/signin, /signup), don't show the dashboard chrome
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  useEffect(() => {
    if (!isAuthPage && !isLoading && !user) {
      router.replace(`/signin?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthPage, isLoading, user, pathname, router]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  // Prevent any portal chrome or sensitive data display while unauthenticated
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Invest IQ Security Gate</h2>
            <p className="text-xs text-muted-foreground mt-1">Verifying portal access permissions...</p>
          </div>
        </div>
      </div>
    );
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
