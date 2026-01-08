
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, query, getDocs, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Order, Dispensary } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { DollarSign, Percent, Search, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const OrderRow = ({ order }: { order: Order }) => {
    const createdAtDate = order.createdAt instanceof Timestamp 
        ? order.createdAt.toDate() 
        : new Date(order.createdAt as string | number || new Date());

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium">{order.dispensaryName}</div>
                <div className="text-sm text-muted-foreground hidden sm:block">{order.id.substring(0, 8)}...</div>
            </TableCell>
            <TableCell>
                <div className="font-medium">{order.customerName}</div>
                <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
            </TableCell>
             <TableCell className="hidden md:table-cell">
                <Badge
                    variant={order.status === 'placed' ? 'secondary' : order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline'}
                    className="capitalize"
                >
                    {order.status}
                </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">{format(createdAtDate, 'PPpp')}</TableCell>
            <TableCell className="text-right">
                <div className="font-semibold">R{order.commission.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">from R{order.total.toFixed(2)} total</div>
            </TableCell>
             <TableCell className="text-right hidden sm:table-cell">
                <div className="font-semibold">R{order.vendorPayout.toFixed(2)}</div>
            </TableCell>
        </TableRow>
    );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AllOrdersPage() {
  const { user: adminUser, isUserLoading: isAdminLoading } = useUser();
  const firestore = useFirestore();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dispensaryFilter, setDispensaryFilter] = useState('all');

  useEffect(() => {
    async function fetchAllOrders() {
      if (!adminUser || !firestore) {
        if (!isAdminLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const ordersQuery = query(collectionGroup(firestore, 'orders'));
        const querySnapshot = await getDocs(ordersQuery);
        
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

        // Sort on the client-side
        const sortedOrders = fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllOrders(sortedOrders);

      } catch (e: any) {
        console.error("Error fetching all orders:", e);
        setError(e.message || "Failed to fetch orders.");
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAdminLoading) {
        fetchAllOrders();
    }
  }, [adminUser, firestore, isAdminLoading]);

  const uniqueDispensaries = useMemo(() => {
    const dispensaries = new Map<string, string>();
    allOrders.forEach(order => {
        if (!dispensaries.has(order.dispensaryId)) {
            dispensaries.set(order.dispensaryId, order.dispensaryName);
        }
    });
    return Array.from(dispensaries.entries()).map(([id, name]) => ({ id, name }));
  }, [allOrders]);
  
  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
        const searchMatch = searchTerm.length > 0 
            ? order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        const statusMatch = statusFilter === 'all' || order.status === statusFilter;
        const dispensaryMatch = dispensaryFilter === 'all' || order.dispensaryId === dispensaryFilter;
        
        return searchMatch && statusMatch && dispensaryMatch;
    });
  }, [allOrders, searchTerm, statusFilter, dispensaryFilter]);


  const { totalRevenue, totalCommission, thirtyDayData, topDispensaries, statusBreakdown } = useMemo(() => {
    const revenue = filteredOrders.reduce((total, order) => total + order.total, 0);
    const commission = filteredOrders.reduce((total, order) => total + order.commission, 0);
    
    // Process data for charts
    const thirtyDaysAgo = subDays(new Date(), 30);
    const dailyData: {[key: string]: { revenue: number, commission: number }} = {};

    const dispensarySales: {[key: string]: { name: string, total: number }} = {};
    const statusCounts: {[key: string]: number} = {};

    filteredOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);

        // 30-day chart data
        if (orderDate >= thirtyDaysAgo) {
            const day = format(orderDate, 'MMM dd');
            if (!dailyData[day]) {
                dailyData[day] = { revenue: 0, commission: 0 };
            }
            dailyData[day].revenue += order.total;
            dailyData[day].commission += order.commission;
        }

        // Top dispensaries data
        if (!dispensarySales[order.dispensaryId]) {
            dispensarySales[order.dispensaryId] = { name: order.dispensaryName, total: 0 };
        }
        dispensarySales[order.dispensaryId].total += order.total;

        // Status breakdown
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    const chartData30Days = Object.entries(dailyData).map(([day, values]) => ({ day, ...values })).reverse();
    const sortedDispensaries = Object.values(dispensarySales).sort((a, b) => b.total - a.total).slice(0, 5);
    const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    return { totalRevenue: revenue, totalCommission: commission, thirtyDayData: chartData30Days, topDispensaries: sortedDispensaries, statusBreakdown: statusChartData };
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Orders</h1>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{allOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}</div>}
                <p className="text-xs text-muted-foreground">Across all orders.</p>
            </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{allOrders.length}</div>}
            <p className="text-xs text-muted-foreground">Total orders on the platform.</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">R{allOrders.reduce((sum, o) => sum + o.commission, 0).toFixed(2)}</div>}
                <p className="text-xs text-muted-foreground">5.5% of total sales.</p>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders List</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
           <Card>
            <CardHeader>
              <CardTitle>Platform-Wide Orders</CardTitle>
              <CardDescription>
                A list of all orders from all dispensaries. Use the filters to narrow your search.
              </CardDescription>
              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer name or email..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Select value={dispensaryFilter} onValueChange={setDispensaryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by dispensary..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Dispensaries</SelectItem>
                        {uniqueDispensaries.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="placed">Placed</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="ready-for-pickup">Ready for Pickup</SelectItem>
                        <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispensary / Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Vendor Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                        <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                     <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-destructive">
                            {error}
                        </TableCell>
                    </TableRow>
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No orders found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reporting">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue &amp; Commission (Last 30 Days)</CardTitle>
                  <CardDescription>Based on the filtered results.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={thirtyDayData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (R)" />
                            <Line type="monotone" dataKey="commission" stroke="#82ca9d" name="Commission (R)" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Dispensaries by Sales</CardTitle>
                  <CardDescription>Based on the filtered results.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDispensaries} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => `R${value.toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="total" name="Total Sales" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Order Status Breakdown</CardTitle>
                   <CardDescription>Based on the filtered results.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                                {statusBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
