'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Truck, Wallet, Navigation, CheckCircle2, Power, MapPin, Search, Package } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, Driver } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function AvailableDeliveriesStats() {
  const firestore = useFirestore();
  const [stats, setStats] = useState({ count: 0, totalEarnings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    // Use onSnapshot for real-time updates if possible, but for now stick to simple fetch
    const fetchAvailableDeliveries = async () => {
      setIsLoading(true);
      try {
        const qReady = query(
          collectionGroup(firestore, 'orders'),
          where('status', '==', 'ready-for-pickup')
        );
        const qConfirmed = query(
          collectionGroup(firestore, 'orders'),
          where('status', '==', 'confirmed')
        );

        const [readySnapshot, confirmedSnapshot] = await Promise.all([
          getDocs(qReady),
          getDocs(qConfirmed)
        ]);

        let totalEarnings = 0;
        const allAvailableDocs = [...readySnapshot.docs, ...confirmedSnapshot.docs];

        allAvailableDocs.forEach(doc => {
          const order = doc.data() as Order;
          totalEarnings += order.deliveryFee || 0;
        });

        setStats({
          count: allAvailableDocs.length,
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

  return {
    count: isLoading ? <Skeleton className="h-10 w-16" /> : stats.count,
    earnings: isLoading ? <Skeleton className="h-10 w-32" /> : `R${stats.totalEarnings.toFixed(2)}`
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

  return {
    count: isLoading ? <Skeleton className="h-10 w-16" /> : stats.count,
    earnings: isLoading ? <Skeleton className="h-10 w-32" /> : `R${stats.totalEarnings.toFixed(2)}`
  };
}

const DriverStatusToggle = ({ isOnline, onToggle }: { isOnline: boolean, onToggle: (checked: boolean) => void }) => {
  return (
    <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border rounded-full px-4 py-2 shadow-sm">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
      )} />
      <span className="text-sm font-bold uppercase tracking-tight">
        {isOnline ? "Online" : "Offline"}
      </span>
      <Switch
        id="driver-status"
        checked={isOnline}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  );
};


export default function DriverDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const availableStats = AvailableDeliveriesStats();
  const completedStats = CompletedDeliveriesStats();

  const driverProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'drivers', user.uid);
  }, [firestore, user]);

  const { data: driverProfile } = useDoc<Driver>(driverProfileRef);
  const isOnline = driverProfile?.availabilityStatus === 'online';

  const handleStatusChange = async (online: boolean) => {
    if (!user || !driverProfile) return;

    const newStatus = online ? 'online' : 'offline';
    try {
      await updateDoc(driverProfileRef!, { availabilityStatus: newStatus });
      toast({
        title: online ? 'You are now Online' : 'You are now Offline',
        description: online ? 'Ready to accept new delivery requests!' : 'Checking out for now.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground text-lg">Your delivery hub and earnings overview.</p>
        </div>
        <DriverStatusToggle isOnline={isOnline} onToggle={handleStatusChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Available Deliveries Card */}
        <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Deliveries</CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Truck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-black mb-2 tracking-tighter">
              {availableStats.count}
            </div>
            <p className="text-sm text-muted-foreground font-medium">Orders ready for pickup</p>
          </CardContent>
        </Card>

        {/* Potential Earnings Card */}
        <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Potential Earnings</CardTitle>
            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black mb-2 tracking-tighter whitespace-nowrap">
              {availableStats.earnings}
            </div>
            <p className="text-sm text-muted-foreground font-medium">From available deliveries</p>
          </CardContent>
        </Card>

        {/* Completed Earnings Card */}
        <Card className="rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Delivery Earnings</CardTitle>
            <div className="bg-green-500/10 p-2 rounded-lg text-green-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black mb-2 tracking-tighter whitespace-nowrap">
              {completedStats.earnings}
            </div>
            <p className="text-sm text-muted-foreground font-medium">From all completed deliveries.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            Getting Started
          </h2>
          <div className="grid gap-4">
            {[
              { title: "Go Online", desc: "Toggle your status to 'Online' to start appearing for new order requests.", icon: Power },
              { title: "Check My Deliveries", desc: "Navigate to the 'My Deliveries' section to browse and accept available orders.", icon: Package },
              { title: "Pick up & Deliver", desc: "Head to the dispensary, pick up the items, and deliver them to our happy customers!", icon: MapPin }
            ].map((step, i) => (
              <div key={i} className="group flex gap-5 bg-card border border-border/50 p-6 rounded-2xl hover:border-primary/50 transition-colors shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <step.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">{step.title}</p>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Delivery Requirements
          </h2>
          <div className="bg-card border border-border/50 p-8 rounded-2xl space-y-6 shadow-sm">
            {[
              "Always verify customer ID upon delivery to ensure they are of legal age.",
              "Maintain a clean and professional appearance as a representative of Budmaps.",
              "Double check all items against the order list before leaving the dispensary.",
              "Contact support immediately if you encounter any issues during delivery."
            ].map((req, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                <p className="text-lg leading-snug">{req}</p>
              </div>
            ))}

            <div className="mt-8 pt-6 border-t font-semibold text-primary flex justify-between items-center">
              <span>Need Help?</span>
              <Button variant="link" className="font-bold">Contact Support</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
