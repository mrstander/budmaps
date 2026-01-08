
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendorProductStats() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [productCount, setProductCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProductCount = async () => {
            if (!user || !firestore) return;
            
            setIsLoading(true);
            try {
                // Find all dispensaries owned by the current vendor by looking in their private collection.
                const dispensariesRef = collection(firestore, 'users', user.uid, 'dispensaries');
                const dispensarySnapshot = await getDocs(dispensariesRef);
                
                let totalProducts = 0;
                // For each dispensary, count its products.
                for (const dispensaryDoc of dispensarySnapshot.docs) {
                    const productsRef = collection(firestore, 'dispensaries', dispensaryDoc.id, 'products');
                    const productsSnapshot = await getDocs(productsRef);
                    totalProducts += productsSnapshot.size;
                }
                
                setProductCount(totalProducts);

            } catch (error) {
                console.error("Error fetching product count:", error);
                setProductCount(0);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isUserLoading) {
            fetchProductCount();
        }
    }, [user, firestore, isUserLoading]);
    
    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <div className="text-2xl font-bold">{productCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Live on storefront</p>
          </CardContent>
        </Card>
    );
}
