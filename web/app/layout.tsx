'use client';

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import "./globals.css";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { systemTheme } = useTheme();

  return (
    <html lang="en">
      <head>
        <title>Transmission RSS</title>
      </head>
      <body>
        <HeroUIProvider>
          <NextThemesProvider attribute="class" defaultTheme={systemTheme}>
            {children}
          </NextThemesProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}
