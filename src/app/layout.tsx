import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemedToaster } from '@/components/ui/ThemedToaster';
import { BlackHoleCanvas } from '@/components/singularity/BlackHoleCanvas';
import { FloatingThemeToggle } from '@/components/singularity/FloatingThemeToggle';
import { CommandPalette } from '@/components/singularity/CommandPalette';
import { GhostFx } from '@/components/ui/GhostFx';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
  viewportFit: 'cover',
};

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Ghostboard — AI Real-Time Teleprompter & Live Performance Coach',
  description: 'AI-Powered Real-Time Teleprompter & Live Performance Coach for Technical Interviews & Daily Standups. Overcome language barriers, reduce interview anxiety, and structure your responses with low-latency STT and smart recall prompts.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Ghostboard — AI Real-Time Teleprompter & Live Performance Coach',
    description: 'AI-Powered Real-Time Teleprompter & Live Performance Coach for Technical Interviews & Daily Standups. Overcome language barriers, reduce anxiety, and excel with live speech transcription and teleprompter HUD.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Ghostboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ghostboard — AI Real-Time Teleprompter & Live Performance Coach',
    description: 'AI-Powered Real-Time Teleprompter & Live Performance Coach for Technical Interviews & Daily Standups. Low-latency STT, structured recall prompts, and multi-device teleprompter HUD.',
  },
  keywords: ['AI teleprompter', 'interview coach', 'technical interview', 'speech anxiety', 'language barrier', 'Deepgram STT', 'real-time AI', 'live teleprompter'],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark min-h-full w-full" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen w-full overflow-x-hidden subpixel-antialiased bg-black text-zinc-100 font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("gb-theme");if(!t){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t!=="light");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#f4f4f2":"#000000")}catch(e){}` }} />
        <LocaleProvider>
          <BlackHoleCanvas />
          <CommandPalette />
          <FloatingThemeToggle />
          <GhostFx />
          {children}
        </LocaleProvider>
        <ServiceWorkerRegister />
        <ThemedToaster />
      </body>
    </html>
  );
}
