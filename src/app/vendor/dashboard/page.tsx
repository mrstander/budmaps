
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import VendorProductStats from './vendor-product-stats';
import VendorOrderStats from './vendor-order-stats';
import VendorRevenueStats from './vendor-revenue-stats';
import RecentOrders from './recent-orders';

export default function VendorDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <VendorRevenueStats />
        <VendorOrderStats />
        <VendorProductStats />

      </div>
      <div className="mt-8">
        <RecentOrders />
      </div>
    </div>
  );
}
