
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminVendorStats() {
    const firestore = useFirestore();
    const [vendorCount, setVendorCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVendorCount = async () => {
            if (!firestore) return;
            
            setIsLoading(true);
            try {
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('role', '==', 'vendor'));
                const querySnapshot = await getDocs(q);
                setVendorCount(querySnapshot.size);
            } catch (error) {
                console.error("Error fetching vendor count:", error);
                setVendorCount(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVendorCount();
    }, [firestore]);
    
    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <div className="text-2xl font-bold">{vendorCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Total registered vendors.</p>
          </CardContent>
        </Card>
    );
}
