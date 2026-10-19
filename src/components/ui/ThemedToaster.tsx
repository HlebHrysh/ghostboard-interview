"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/singularity/useTheme";

export function ThemedToaster() {
  return <Toaster theme={useTheme()} position="bottom-right" closeButton richColors />;
}
