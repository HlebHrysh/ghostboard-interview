"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLogin) {
    return <div className="min-h-screen bg-[#040406] text-zinc-300">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-300 flex selection:bg-[#C8F135]/30">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col min-h-screen w-full md:pl-64">
        <AdminHeader onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
