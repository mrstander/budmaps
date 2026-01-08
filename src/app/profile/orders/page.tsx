
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'placed' | 'out-for-delivery' | 'completed';

const OrderItem = ({ order }: { order: Order }) => {
    // Handle both server-side ISO string and client-side Timestamp object
    const orderDate = order.createdAt instanceof Timestamp 
        ? order.createdAt.toDate() 
        : new Date(order.createdAt as string | number);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-grow">
                    <CardTitle className="text-lg">{order.dispensaryName}</CardTitle>
                    <CardDescription>
                        Ordered on {format(orderDate, 'PP')}
                    </CardDescription>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-lg">R{order.total.toFixed(2)}</p>
                    <Badge 
                        variant={order.status === 'placed' ? 'secondary' : order.status === 'completed' ? 'default' : 'outline'}
                        className="capitalize mt-1"
                    >
                        {order.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="mb-4" />
                <div className="space-y-3">
                    {order.items.map((item, index) => (
                        <div key={item.productId + index}>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.weight} - R{item.price.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
             <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/dispensary/${order.dispensaryId}`}>Reorder</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function MyOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => {
    if (user && firestore) {
      const fetchOrders = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const ordersRef = collection(firestore, 'users', user.uid, 'orders');
          const q = query(ordersRef, orderBy('createdAt', 'desc'));

          const querySnapshot = await getDocs(q);
          const fetchedOrders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              ...data,
              id: doc.id,
              createdAt: data.createdAt instanceof Timestamp 
                  ? data.createdAt.toDate().toISOString() 
                  : data.createdAt,
            } as Order;
          });
          setOrders(fetchedOrders);
        } catch (e: any) {
          console.error("Error fetching orders:", e);
          setError(e.message || "Failed to fetch your orders.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrders();
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, firestore, isUserLoading]);
  
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') {
      return orders;
    }
    return orders.filter(order => order.status === filterStatus);
  }, [orders, filterStatus]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="text-center py-16 border-dashed border-2 rounded-lg border-destructive/50 bg-destructive/10 text-destructive">
                 <h2 className="text-2xl font-semibold">Error Fetching Orders</h2>
                 <p className="mt-2">{error}</p>
            </div>
        );
    }

    if (orders.length === 0 && user) {
        return (
            <div className="text-center py-16 border-dashed border-2 rounded-lg bg-card">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold">No Orders Found</h2>
                <p className="text-muted-foreground mt-2 mb-6">You haven't placed any orders yet. Let's change that!</p>
                <Button asChild>
                    <Link href="/">Start Shopping</Link>
                </Button>
            </div>
        );
    }

    if (!user && !isUserLoading) {
        return (
            <div className="text-center py-16 border-dashed border-2 rounded-lg">
                <h2 className="text-2xl font-semibold">Please Log In</h2>
                <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to view your orders.</p>
                <Button asChild>
                    <Link href="/login">Log In</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => <OrderItem key={order.id} order={order} />)
            ) : (
                <div className="text-center py-16 border-dashed border-2 rounded-lg bg-card">
                    <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold">No Orders Found</h2>
                    <p className="text-muted-foreground mt-2">There are no orders with the status "{filterStatus}".</p>
                </div>
            )}
        </>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline">My Orders</h1>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                {(['all', 'placed', 'out-for-delivery', 'completed'] as FilterStatus[]).map(status => (
                    <Button 
                        key={status}
                        variant={filterStatus === status ? 'default' : 'ghost'}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                            "flex-1 justify-center capitalize",
                            filterStatus === status && "bg-white text-foreground shadow-sm hover:bg-white/90"
                        )}
                    >
                        {status.replace('-', ' ')}
                    </Button>
                ))}
            </div>
        </div>
        {renderContent()}
    </div>
  );
}
