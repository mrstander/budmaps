
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Dispensary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function AdminStoresPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const dispensariesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'dispensaries'), orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: dispensaries, isLoading: areDispensariesLoading, error } = useCollection<Dispensary>(dispensariesQuery);

  const isLoading = isUserLoading || areDispensariesLoading;

  const handleFeatureToggle = async (dispensary: Dispensary) => {
    if (!firestore || !dispensary.id || !dispensary.vendorId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Dispensary data is incomplete.',
        });
        return;
    };
    
    const publicDispensaryRef = doc(firestore, 'dispensaries', dispensary.id);
    const privateDispensaryRef = doc(firestore, 'users', dispensary.vendorId, 'dispensaries', dispensary.id);

    const newFeaturedState = !dispensary.isFeatured;

    try {
      const batch = writeBatch(firestore);
      batch.update(publicDispensaryRef, { isFeatured: newFeaturedState });
      batch.update(privateDispensaryRef, { isFeatured: newFeaturedState });
      await batch.commit();

      toast({
        title: 'Success',
        description: `${dispensary.name} has been ${newFeaturedState ? 'featured' : 'unfeatured'}.`,
      });
      // The useCollection hook will automatically update the UI after a short delay
    } catch (err: any) {
      console.error("Error toggling feature status:", err);
      toast({
        variant: 'destructive',
        title: 'Error updating dispensary',
        description: err.message,
      });
    }
  };

  const StoreRow = ({ store }: { store: Dispensary }) => (
    <TableRow>
      <TableCell className="font-medium">{store.name}</TableCell>
      <TableCell>{store.city}, {store.state}</TableCell>
      <TableCell className="hidden md:table-cell">{store.phone}</TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant={store.isFeatured ? 'default' : 'outline'}>
          {store.isFeatured ? 'Featured' : 'Not Featured'}
        </Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={store.isFeatured || false}
          onCheckedChange={() => handleFeatureToggle(store)}
          aria-label={`Feature ${store.name}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/admin/dashboard/store/${store.id}`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Stores</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Platform Dispensaries</CardTitle>
          <CardDescription>
            A list of all store locations on the platform. Toggle the switch to feature a store on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-destructive">
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : dispensaries && dispensaries.length > 0 ? (
                dispensaries.map((store) => <StoreRow key={store.id} store={store} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No stores found on the platform yet.
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
