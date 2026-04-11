import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { NotificationsProvider } from "@/context/notifications-context";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "NearZro - Event Management Platform",
  description: "Plan your perfect event with NearZro",
  icons: {
    icon: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* Razorpay Script for Payment Gateway */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body
        className="font-sans antialiased"
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <AuthProvider>
          <CartProvider>
            <NotificationsProvider>
              {children}
              <Toaster richColors position="top-right" />
            </NotificationsProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
