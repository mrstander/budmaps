
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Truck, Map, Wallet, Package } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, Driver } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

function AvailableDeliveriesStats() {
  const firestore = useFirestore();
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchAvailableDeliveries = async () => {
      setIsLoading(true);
      try {
        const ordersQuery = query(
          collectionGroup(firestore, 'orders'),
          where('status', '==', 'ready-for-pickup')
        );
        const querySnapshot = await getDocs(ordersQuery);
        
        let totalEarnings = 0;
        querySnapshot.forEach(doc => {
            const order = doc.data() as Order;
            totalEarnings += order.deliveryFee || 0;
        });

        setStats({
            count: querySnapshot.size,
            totalEarnings: totalEarnings
        });

      } catch (error) {
        console.error("Error fetching available deliveries stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableDeliveries();
  }, [firestore]);

  if (isLoading) {
    return {
        count: <Skeleton className="h-8 w-16" />,
        earnings: <Skeleton className="h-8 w-24" />
    };
  }

  return {
      count: <div className="text-2xl font-bold">{stats.count}</div>,
      earnings: <div className="text-2xl font-bold">R{stats.totalEarnings.toFixed(2)}</div>
  };
}

function CompletedDeliveriesStats() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchCompletedDeliveries = async () => {
      setIsLoading(true);
      try {
        const ordersQuery = query(
          collectionGroup(firestore, 'orders'),
          where('status', '==', 'completed'),
          where('driverId', '==', user.uid)
        );
        const querySnapshot = await getDocs(ordersQuery);
        
        let totalEarnings = 0;
        querySnapshot.forEach(doc => {
            const order = doc.data() as Order;
            totalEarnings += order.deliveryFee || 0;
        });

        setStats({
            count: querySnapshot.size,
            totalEarnings: totalEarnings
        });

      } catch (error) {
        console.error("Error fetching completed deliveries stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedDeliveries();
  }, [firestore, user]);

  if (isLoading) {
    return {
        count: <Skeleton className="h-8 w-16" />,
        earnings: <Skeleton className="h-8 w-24" />
    };
  }

  return {
      count: <div className="text-2xl font-bold">{stats.count}</div>,
      earnings: <div className="text-2xl font-bold">R{stats.totalEarnings.toFixed(2)}</div>
  };
}

const DriverStatusToggle = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const driverProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'drivers', user.uid);
    }, [firestore, user]);
    
    const { data: driverProfile, isLoading: isProfileLoading } = useDoc<Driver>(driverProfileRef);
    
    const handleStatusChange = async (isOnline: boolean) => {
        if (!user || !driverProfile) return;
        
        const newStatus = isOnline ? 'online' : 'offline';
        try {
            await updateDoc(driverProfileRef!, { availabilityStatus: newStatus });
            toast({
                title: 'Status Updated',
                description: `You are now ${newStatus}.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message,
            });
        }
    };

    if (isUserLoading || isProfileLoading) {
        return (
             <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-48" />
             </div>
        )
    }

    const isOnline = driverProfile?.availabilityStatus === 'online';

    return (
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <Switch
                    id="driver-status"
                    checked={isOnline}
                    onCheckedChange={handleStatusChange}
                />
                <Label htmlFor="driver-status" className="text-2xl font-bold capitalize cursor-pointer">
                    {driverProfile?.availabilityStatus || 'Offline'}
                </Label>
            </div>
            <p className="text-xs text-muted-foreground">
                {isOnline ? "You are visible for new orders." : "You are hidden from new orders."}
            </p>
        </div>
    );
};


export default function DriverDashboardPage() {
  const availableStats = AvailableDeliveriesStats();
  const completedStats = CompletedDeliveriesStats();
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Driver Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {availableStats.count}
            <p className="text-xs text-muted-foreground">Orders ready for pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Earnings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {availableStats.earnings}
            <p className="text-xs text-muted-foreground">From available deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Delivery Earnings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {completedStats.earnings}
            <p className="text-xs text-muted-foreground">From deliveries in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DriverStatusToggle />
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Welcome to the Driver Dashboard!</CardTitle>
                <CardDescription>
                    This is your hub for finding and managing deliveries. Navigate to 'My Deliveries' to see available jobs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Available orders in your area will appear in the 'My Deliveries' section.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
