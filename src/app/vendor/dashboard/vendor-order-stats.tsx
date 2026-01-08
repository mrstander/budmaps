
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendorOrderStats() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [orderCount, setOrderCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrderCount = async () => {
            if (!user || !firestore) return;
            
            setIsLoading(true);
            try {
                // Find all dispensaries owned by the current vendor
                const dispensariesRef = collection(firestore, 'users', user.uid, 'dispensaries');
                const dispensarySnapshot = await getDocs(dispensariesRef);
                
                let totalOrders = 0;
                // For each dispensary, count its orders
                for (const dispensaryDoc of dispensarySnapshot.docs) {
                    const ordersRef = collection(firestore, 'dispensaries', dispensaryDoc.id, 'orders');
                    const ordersSnapshot = await getDocs(ordersRef);
                    totalOrders += ordersSnapshot.size;
                }
                
                setOrderCount(totalOrders);

            } catch (error) {
                console.error("Error fetching order count:", error);
                setOrderCount(0);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isUserLoading) {
            fetchOrderCount();
        }
    }, [user, firestore, isUserLoading]);
    
    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <div className="text-2xl font-bold">{orderCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Across all your stores.</p>
          </CardContent>
        </Card>
    );
}
