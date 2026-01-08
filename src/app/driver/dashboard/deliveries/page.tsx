
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collectionGroup, query, where, doc, writeBatch, getDocs, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import type { Order, Driver } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Check, Package, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const DeliveryCard = ({ order, onOrderUpdate }: { order: Order, onOrderUpdate: () => void }) => {
    const firestore = useFirestore();
    const { user: driver } = useUser();
    const { toast } = useToast();
    
    const handleAcceptDelivery = async () => {
        if (!driver || !firestore) return;
        
        const batch = writeBatch(firestore);
        const updateData = {
            status: 'out-for-delivery',
            driverId: driver.uid,
            pickedUpAt: serverTimestamp()
        };
        
        batch.update(doc(firestore, `dispensaries/${order.dispensaryId}/orders/${order.id}`), updateData);
        batch.update(doc(firestore, `users/${order.customerId}/orders/${order.id}`), updateData);

        try {
            await batch.commit();
            toast({ title: "Delivery Accepted!", description: `You are now delivering order #${order.id.substring(0,5)}...` });
            onOrderUpdate();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error accepting delivery", description: error.message });
            console.error("Error accepting delivery:", error);
        }
    };
    
    const handleCompleteDelivery = async () => {
        if (!driver || !firestore) return;

         const batch = writeBatch(firestore);
         const updateData = {
             status: 'completed',
             completedAt: serverTimestamp()
         };
        
        batch.update(doc(firestore, `dispensaries/${order.dispensaryId}/orders/${order.id}`), updateData);
        batch.update(doc(firestore, `users/${order.customerId}/orders/${order.id}`), updateData);

        try {
            await batch.commit();
            toast({ title: "Delivery Completed!", description: "Great job!" });
            onOrderUpdate();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error completing delivery", description: error.message });
        }
    };

    const getTimestampInfo = () => {
        switch (order.status) {
            case 'ready-for-pickup':
                return order.createdAt ? `Placed: ${format(new Date((order.createdAt as any).seconds * 1000), 'PPpp')}` : '';
            case 'out-for-delivery':
                return order.pickedUpAt ? `Accepted: ${format(new Date((order.pickedUpAt as any).seconds * 1000), 'PPpp')}` : '';
            case 'completed':
                return order.completedAt ? `Completed: ${format(new Date((order.completedAt as any).seconds * 1000), 'PPpp')}` : '';
            default:
                return order.createdAt ? `Placed: ${format(new Date((order.createdAt as any).seconds * 1000), 'PPpp')}` : '';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Order for {order.customerName}</span>
                    <Badge variant="secondary">{order.status}</Badge>
                </CardTitle>
                <CardDescription>From: {order.dispensaryName}</CardDescription>
                <div className="text-xs text-muted-foreground flex items-center pt-2">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {getTimestampInfo()}
                </div>
            </CardHeader>
            <CardContent>
                <p className="font-semibold">Delivery Address:</p>
                <p>{order.address}, {order.city}, {order.state} {order.zipCode}</p>
                <p className="mt-2 font-semibold">Items:</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {order.items.map(item => (
                        <li key={item.productId}>{item.name} (x{item.quantity})</li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="font-bold text-lg">Total: R{order.total.toFixed(2)} (Cash)</div>
                {order.status === 'ready-for-pickup' && (
                    <Button onClick={handleAcceptDelivery}>
                        <Truck className="mr-2 h-4 w-4" /> Accept Delivery
                    </Button>
                )}
                {order.status === 'out-for-delivery' && order.driverId === driver?.uid && (
                    <Button onClick={handleCompleteDelivery} variant="default">
                        <Check className="mr-2 h-4 w-4" /> Complete Delivery
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

function DriverDeliveries({ driver, onOrderUpdate }: { driver: any, onOrderUpdate: () => void }) {
    const firestore = useFirestore();
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!firestore || !driver?.uid) return;

        const fetchDeliveries = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch all orders that are either ready for pickup OR assigned to this driver
                const ordersQuery = query(
                    collectionGroup(firestore, 'orders'),
                    where('status', 'in', ['ready-for-pickup', 'out-for-delivery', 'completed'])
                );

                const querySnapshot = await getDocs(ordersQuery);
                const fetchedOrders = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Order))
                    .filter(order => 
                        order.status === 'ready-for-pickup' || order.driverId === driver.uid
                    )
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setAllOrders(fetchedOrders);

            } catch (err: any) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeliveries();

    }, [firestore, driver?.uid, onOrderUpdate]);

    const activeDeliveries = useMemo(() => allOrders?.filter(order => order.status === 'out-for-delivery' && order.driverId === driver.uid), [allOrders, driver.uid]);
    const availableDeliveries = useMemo(() => allOrders?.filter(order => order.status === 'ready-for-pickup'), [allOrders]);
    const pastDeliveries = useMemo(() => allOrders?.filter(order => (order.status === 'completed' || order.status === 'cancelled') && order.driverId === driver.uid), [allOrders, driver.uid]);

    const renderList = (title: string, deliveries: Order[] | undefined, listIsLoading: boolean, listError: Error | null, emptyMessage: string, emptySubMessage: string) => (
        <div>
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            {listIsLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}
            {listError && <p className="text-destructive">Error: {listError.message}</p>}
            {!listIsLoading && !listError && deliveries && deliveries.length > 0 ? (
                <div className="space-y-4">
                    {deliveries.map(order => <DeliveryCard key={order.id} order={order} onOrderUpdate={onOrderUpdate} />)}
                </div>
            ) : !listIsLoading && !listError && (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <p className="font-semibold">{emptyMessage}</p>
                    <p className="text-sm text-muted-foreground">{emptySubMessage}</p>
                </Card>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            {renderList("Active Delivery", activeDeliveries, isLoading, error, "You have no active deliveries.", "Accept a delivery to see it here.")}
            {renderList(`Available for Pickup`, availableDeliveries, isLoading, error, "No deliveries available for pickup.", "Check back later for new opportunities.")}
            {renderList("Past Deliveries", pastDeliveries, isLoading, error, "You have no past deliveries.", "Completed deliveries will appear here.")}
        </div>
    );
}

export default function DeliveriesPage() {
    const { user: driver, isUserLoading: isDriverLoading } = useUser();
    const [refreshKey, setRefreshKey] = useState(0);

    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    if (isDriverLoading) {
        return (
             <div className="space-y-8">
                <h1 className="text-3xl font-bold mb-8">My Deliveries</h1>
                <Skeleton className="h-10 w-64" />
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    if (!driver) {
        return (
            <div>
                 <h1 className="text-3xl font-bold mb-8">My Deliveries</h1>
                 <p>Could not load driver information. Please log in again.</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">My Deliveries</h1>
            <DriverDeliveries driver={driver} onOrderUpdate={forceRefresh} />
        </div>
    );
}
