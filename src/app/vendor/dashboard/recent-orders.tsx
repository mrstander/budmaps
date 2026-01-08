
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RecentOrders() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user || !firestore) {
        if (!isUserLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);

      try {
        const dispensariesRef = collection(firestore, 'dispensaries');
        const dispensaryQuery = query(dispensariesRef, where('vendorId', '==', user.uid));
        const dispensarySnapshot = await getDocs(dispensaryQuery);
        
        if (dispensarySnapshot.empty) {
            setOrders([]);
            setIsLoading(false);
            return;
        }

        const dispensaryIds = dispensarySnapshot.docs.map(doc => doc.id);
        
        // Due to Firestore limitations (max 10 'in' filters), we fetch from each dispensary.
        // For a small number of dispensaries per vendor, this is okay.
        let allOrders: Order[] = [];
        for (const dispensaryId of dispensaryIds) {
            const ordersRef = collection(firestore, 'dispensaries', dispensaryId, 'orders');
            const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
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
        
        // Sort all fetched orders and take the latest 10
        allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(allOrders.slice(0, 10));

      } catch (e: any) {
        console.error("Error fetching recent orders:", e);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isUserLoading) {
        fetchOrders();
    }
  }, [user, firestore, isUserLoading]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>The 10 most recent orders placed at your stores.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {order.customerEmail}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="capitalize" variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(order.createdAt), 'PP')}
                  </TableCell>
                  <TableCell className="text-right">R{order.total.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No recent orders.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
            <Button asChild variant="outline">
                <Link href="/vendor/dashboard/orders">View All Orders</Link>
            </Button>
       </CardFooter>
    </Card>
  );
}
