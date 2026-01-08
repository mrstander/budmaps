'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Dispensary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import AddStoreForm from './add-store-form';

export default function StoresPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const dispensariesQuery = useMemoFirebase(() => {
    if (!user) return null;
    // Query the private collection of dispensaries under the user's document
    return query(collection(firestore, 'users', user.uid, 'dispensaries'));
  }, [firestore, user]);

  const { data: dispensaries, isLoading: areDispensariesLoading, error } = useCollection<Dispensary>(dispensariesQuery);

  const isLoading = isUserLoading || areDispensariesLoading;

  const StoreRow = ({ store }: { store: Dispensary }) => (
    <TableRow>
      <TableCell className="font-medium">{store.name}</TableCell>
      <TableCell>{store.city}, {store.state}</TableCell>
      <TableCell className="hidden md:table-cell">{store.phone}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/vendor/dashboard/store/${store.id}`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Stores</h1>
      
      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList>
            <TabsTrigger value="stores">All Stores</TabsTrigger>
            <TabsTrigger value="add">Add New Store</TabsTrigger>
        </TabsList>
        <TabsContent value="stores">
            <Card>
            <CardHeader>
                <CardTitle>Your Dispensaries</CardTitle>
                <CardDescription>
                A list of all your store locations.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Store Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="hidden md:table-cell">Phone</TableHead>
                        <TableHead className="w-[50px] text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={4}>
                                <Skeleton className="h-5 w-full" />
                            </TableCell>
                        </TableRow>
                        ))
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-destructive">
                                {error.message}
                            </TableCell>
                        </TableRow>
                    ) : dispensaries && dispensaries.length > 0 ? (
                        dispensaries.map((store) => <StoreRow key={store.id} store={store} />)
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            You haven't added any stores yet.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="add">
            <AddStoreForm />
        </TabsContent>
       </Tabs>
    </div>
  );
}
