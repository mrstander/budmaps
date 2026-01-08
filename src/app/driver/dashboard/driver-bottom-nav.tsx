
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/driver/dashboard/deliveries', icon: Truck, label: 'Deliveries' },
];

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t h-16 flex justify-around items-center z-20">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 w-full h-full',
              'text-muted-foreground transition-colors hover:text-primary',
              isActive && 'text-primary'
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
