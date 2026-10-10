"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLogin) {
    return <div className="min-h-screen bg-[#000000] text-zinc-300">{children}</div>;
  }

  return (
    <SubpageStripesContainer pattern="telemetry" className="min-h-screen text-zinc-300 selection:bg-white selection:text-black">
      <div className="flex min-h-screen">
        <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex flex-col min-h-screen w-full md:pl-64">
          <AdminHeader onMobileMenuToggle={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto relative z-10">
            {children}
          </main>
        </div>
      </div>
    </SubpageStripesContainer>
  );
}
