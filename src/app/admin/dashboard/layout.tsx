
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, LayoutDashboard, Users, ShoppingCart, MapPin, User, Bell, Shield, Store, Package } from 'lucide-react';
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
import { useUser } from '@/firebase';
import { CartProvider } from '@/context/cart-context';


const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/dashboard/stores', icon: Store, label: 'Stores' },
  { href: '/admin/dashboard/products', icon: Package, label: 'Products' },
  { href: '/admin/dashboard/users', icon: Users, label: 'Users' },
  { href: '/admin/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/dashboard/reporting', icon: BarChart, label: 'Reporting' },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();

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
                    isActive={pathname === item.href}
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
                <Shield />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Admin Account</p>
              </div>
              <Button variant="ghost" size="icon">
                <Bell />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/40">{children}</main>
        </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
    </CartProvider>
  )
}
