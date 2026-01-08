
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Settings } from 'lucide-react';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { cn } from '@/lib/utils';

const profileNavItems = [
  { href: '/profile/orders', icon: Package, label: 'My Orders' },
  { href: '/profile/settings', icon: Settings, label: 'Settings' },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-dvh bg-muted/20">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1">
            <nav className="flex flex-col space-y-2 bg-card p-4 rounded-lg shadow-sm">
              {profileNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      isActive && "bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="md:col-span-3">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
