import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CINE PACK",
  description: "App de producción de CINE PACK",
  robots: "noindex, nofollow",
};

// Sin esto, el navegador móvil renderiza como si fuera de escritorio
// (~980px) y lo achica para que entre en pantalla — el usuario tiene que
// pellizcar para volver a ver el tamaño real, y como no hay viewport
// declarado, vuelve a pasar en cada carga de página nueva. No se bloquea
// el zoom (userScalable) a propósito: WCAG exige poder ampliar hasta 200%
// para usuarios con baja visión, solo se corrige la escala inicial.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
