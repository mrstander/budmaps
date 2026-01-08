
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Users, ShoppingCart, DollarSign, Store } from 'lucide-react';
import AdminUserStats from './admin-user-stats';
import AdminVendorStats from './admin-vendor-stats';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        
        <AdminUserStats />
        <AdminVendorStats />

      </div>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Welcome to the Admin Dashboard</CardTitle>
                <CardDescription>
                    This is your control center for managing the entire budmaps platform.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Use the navigation to manage stores, products, users, and view all orders and reporting.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    