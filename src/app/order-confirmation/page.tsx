
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { useUser } from '@/firebase';

// This page is now deprecated in favor of /payment/success
// But we keep it in case of other payment flows.
export default function OrderConfirmationPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto">
          <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
          <h1 className="text-3xl font-bold mb-2">Thank you for your order!</h1>
          <p className="text-muted-foreground mb-6">
            Your order has been successfully placed. The dispensary will confirm it shortly. You can view your order history in your account profile.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/">Continue Shopping</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile/orders">View My Orders</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
