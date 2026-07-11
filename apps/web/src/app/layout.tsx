import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import AppChrome from "@/components/app-chrome";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Argue — Stop betting on silence. Trade the debate.",
  description:
    "Two characters argue live. Follow the match, choose a side, and see how it ends.",
  icons: {
    icon: [
      { url: "/argue-mark.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/argue-mark.svg", type: "image/svg+xml" }],
    shortcut: "/argue-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} light h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;d.classList.remove('dark');d.classList.add('light');d.style.colorScheme='light';localStorage.setItem('multimarkets-theme','light');}catch(e){document.documentElement.classList.add('light')}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
