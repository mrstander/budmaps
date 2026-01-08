
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from '@/context/cart-context';
import { FirebaseClientProvider } from '@/firebase';
import PushNotificationManager from '@/components/PushNotificationManager';
import AgeGate from '@/components/age-gate';

export const metadata: Metadata = {
  title: 'budmaps',
  description: 'Explore local dispensaries, find the best deals, and discover new products.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <FirebaseClientProvider>
          <CartProvider>
            <AgeGate />
            <PushNotificationManager />
            {children}
            <Toaster />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
