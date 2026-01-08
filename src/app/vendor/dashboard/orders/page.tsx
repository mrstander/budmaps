
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { DollarSign, Truck, Percent, MoreHorizontal, XCircle, CheckCircle, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { notifyDrivers } from '@/ai/flows/notify-drivers-flow';

const OrderRow = ({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (orderId: string, newStatus: Order['status']) => void; }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const createdAtDate = order.createdAt instanceof Timestamp 
        ? order.createdAt.toDate() 
        : new Date(order.createdAt as string | number || new Date());
    
    const vendorPayout = order.vendorPayout ?? 0;
    const deliveryFee = order.deliveryFee ?? 0;

    const handleStatusChange = async (newStatus: Order['status']) => {
        if (!firestore) return;
        
        const batch = writeBatch(firestore);
        
        const updateData: any = { status: newStatus };
        if (newStatus === 'confirmed') {
            updateData.confirmedAt = serverTimestamp();
        }
        if (newStatus === 'ready-for-pickup') {
            updateData.confirmedAt = order.confirmedAt || serverTimestamp(); // Keep original if exists
        }

        batch.update(doc(firestore, 'dispensaries', order.dispensaryId, 'orders', order.id), updateData);
        batch.update(doc(firestore, 'users', order.customerId, 'orders', order.id), updateData);

        try {
            await batch.commit();
            toast({ title: "Order Status Updated", description: `Order moved to '${newStatus}'.` });
            
            if (newStatus === 'ready-for-pickup') {
                // Trigger the notification flow, but don't block the UI
                notifyDrivers({ orderId: order.id, dispensaryId: order.dispensaryId })
                    .then(() => console.log(`Notification flow triggered for order ${order.id}`))
                    .catch(err => console.error("Failed to trigger notification flow:", err));
            }

            onStatusUpdate(order.id, newStatus);
        } catch (err: any) {
            console.error("Failed to update order status:", err);
            toast({ variant: 'destructive', title: "Update Failed", description: err.message });
        }
    };

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="font-medium">{order.customerName}</div>
                <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    {order.items.map(item => (
                        <span key={item.productId} className="truncate max-w-xs">{item.name} (x{item.quantity})</span>
                    ))}
                </div>
            </TableCell>
            <TableCell>
                <Badge
                    variant={order.status === 'placed' ? 'secondary' : order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline'}
                    className="capitalize"
                >
                    {order.status}
                </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">{format(createdAtDate, 'PPpp')}</TableCell>
            <TableCell className="text-right">
                <div className="font-semibold">R{vendorPayout.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">R{deliveryFee.toFixed(2)} Delivery</div>
            </TableCell>
            <TableCell className="text-right">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!['placed', 'confirmed'].includes(order.status)}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {order.status === 'placed' && (
                           <>
                            <DropdownMenuItem onClick={() => handleStatusChange('confirmed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm Order
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="text-destructive">
                                 <XCircle className="mr-2 h-4 w-4" />
                                Cancel Order
                            </DropdownMenuItem>
                           </>
                        )}
                         {order.status === 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange('ready-for-pickup')}>
                                <Package className="mr-2 h-4 w-4" />
                                Ready for Pickup
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};

export default function OrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!user || !firestore) {
        if (!isUserLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const dispensariesRef = collection(firestore, 'dispensaries');
        const dispensaryQuery = query(dispensariesRef, where('vendorId', '==', user.uid));
        const dispensarySnapshot = await getDocs(dispensaryQuery);

        if (dispensarySnapshot.empty) {
          setError("You have not set up your store yet. Please set it up in the 'My Store' tab.");
          setOrders([]);
          setIsLoading(false);
          return;
        }

        let allOrders: Order[] = [];
        for (const dispensaryDoc of dispensarySnapshot.docs) {
          const dispensaryId = dispensaryDoc.id;
          const ordersRef = collection(firestore, 'dispensaries', dispensaryId, 'orders');
          const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));
          const ordersSnapshot = await getDocs(ordersQuery);

          const fetchedOrders = ordersSnapshot.docs.map(doc => {
              const data = doc.data();
              return { 
                  ...data,
                  id: doc.id,
                  createdAt: data.createdAt instanceof Timestamp 
                      ? data.createdAt.toDate().toISOString() 
                      : data.createdAt,
              } as Order;
          });
          allOrders = [...allOrders, ...fetchedOrders];
        }
        
        allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(allOrders);

      } catch (e: any) {
        console.error("Error fetching orders:", e);
        setError(e.message || "Failed to fetch orders.");
      } finally {
        setIsLoading(false);
      }
    }

    if (!isUserLoading) {
        fetchOrders();
    }
  }, [user, firestore, isUserLoading]);

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    setOrders(prevOrders => 
        prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
        )
    );
  };

  const totalPayout = useMemo(() => {
    return orders.reduce((total, order) => total + (order.vendorPayout || 0), 0);
  }, [orders]);

  const totalCommission = useMemo(() => {
    return orders.reduce((total, order) => total + (order.commission || 0), 0);
  }, [orders]);

  const totalDeliveryFees = useMemo(() => {
    return orders.reduce((total, order) => total + (order.deliveryFee || 0), 0);
  }, [orders]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>
      
       <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{totalPayout.toFixed(2)}</div>}
                <p className="text-xs text-muted-foreground">Your earnings after commission.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">budmaps Commission</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{totalCommission.toFixed(2)}</div>}
                <p className="text-xs text-muted-foreground">5.5% of total sales.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Fees Collected</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{totalDeliveryFees.toFixed(2)}</div>}
                <p className="text-xs text-muted-foreground">R50 per delivery.</p>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>
            View and manage incoming orders from customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Your Payout</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-destructive">
                        {error}
                    </TableCell>
                </TableRow>
              ) : orders.length > 0 ? (
                orders.map((order) => <OrderRow key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No orders found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
