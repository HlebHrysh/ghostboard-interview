import React from "react";
import { LayoutContent } from "./LayoutContent";

export const metadata = {
  title: "Ghostboard Admin — Control Vault",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LayoutContent>{children}</LayoutContent>;
}
