import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, JetBrains_Mono, Kanit } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#040406',
  viewportFit: 'cover',
};

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

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

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
    <html lang="en" className="dark min-h-full w-full">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${kanit.variable} min-h-screen w-full overflow-x-hidden antialiased bg-black text-zinc-100 font-sans`}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
        <ServiceWorkerRegister />
        <Toaster theme="dark" position="bottom-right" closeButton richColors />
      </body>
    </html>
  );
}
