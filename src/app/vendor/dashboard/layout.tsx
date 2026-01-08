
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, LayoutDashboard, Package, ShoppingCart, MapPin, User, Bell, Store, LogOut } from 'lucide-react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarFooter,
  SidebarInset
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CartProvider } from '@/context/cart-context';
import { useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/vendor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/vendor/dashboard/stores', icon: Store, label: 'My Stores' },
  { href: '/vendor/dashboard/products', icon: Package, label: 'Products' },
  { href: '/vendor/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/vendor/dashboard/reporting', icon: BarChart, label: 'Reporting' },
];

function VendorLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  }

  return (
    <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Link href="/" className="flex items-center space-x-2">
                <MapPin className="h-8 w-8 text-primary" />
                <span className="font-bold text-lg">budmaps</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href === '/vendor/dashboard/stores' && pathname.startsWith('/vendor/dashboard/store'))}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <User />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Vendor Account</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
    </SidebarProvider>
  );
}


export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <VendorLayoutContent>{children}</VendorLayoutContent>
    </CartProvider>
  );
}
