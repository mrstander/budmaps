'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@/lib/types';

export default function VendorRevenueStats() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCompletedOrdersRevenue = async () => {
            if (!user || !firestore) return;
            
            setIsLoading(true);
            try {
                // Find all dispensaries owned by the current vendor
                const dispensariesRef = collection(firestore, 'users', user.uid, 'dispensaries');
                const dispensarySnapshot = await getDocs(dispensariesRef);
                
                let revenue = 0;
                
                // For each dispensary, fetch its completed orders
                for (const dispensaryDoc of dispensarySnapshot.docs) {
                    const ordersRef = collection(firestore, 'dispensaries', dispensaryDoc.id, 'orders');
                    const q = query(ordersRef, where('status', '==', 'completed'));
                    const ordersSnapshot = await getDocs(q);
                    
                    ordersSnapshot.forEach(orderDoc => {
                        const order = orderDoc.data() as Order;
                        revenue += order.vendorPayout || 0; // Use vendorPayout for accuracy
                    });
                }
                
                setTotalRevenue(revenue);

            } catch (error) {
                console.error("Error fetching completed orders revenue:", error);
                setTotalRevenue(0);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isUserLoading) {
            fetchCompletedOrdersRevenue();
        }
    }, [user, firestore, isUserLoading]);
    
    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Completed)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-32" />
            ) : (
                <div className="text-2xl font-bold">R{totalRevenue.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">From all completed orders.</p>
          </CardContent>
        </Card>
    );
}
