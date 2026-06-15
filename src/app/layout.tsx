import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/common/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "精神避难所",
  description:
    "一个面向社交媒体焦虑的网站工具。帮助你从焦虑、不安、自我否定中抽离出来。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-amber-50 text-gray-800">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
