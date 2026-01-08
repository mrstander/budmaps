
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Dispensary } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Must be a valid URL'),
  openingTime: z.string().min(1, 'Opening time is required'),
  closingTime: z.string().min(1, 'Closing time is required'),
  imageUrl: z.string().url('Must be a valid URL').optional(),
});

export default function StorePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      website: '',
      openingTime: '09:00',
      closingTime: '22:00',
      imageUrl: '',
    },
  });

  const { formState: { isSubmitting, isDirty }, reset } = form;

  useEffect(() => {
    async function fetchStore() {
      if (user && firestore) {
        // The dispensary document is now nested under the user
        const dispensaryDocRef = doc(firestore, 'users', user.uid, 'dispensaries', user.uid);
        const docSnap = await getDoc(dispensaryDocRef);
        
        if (docSnap.exists()) {
          const storeData = docSnap.data() as Dispensary;
          reset({
            name: storeData.name,
            address: storeData.address || '',
            city: storeData.city || '',
            state: storeData.state || '',
            zipCode: storeData.zipCode || '',
            phone: storeData.phone || '',
            website: storeData.website || '',
            openingTime: storeData.openingTime || '09:00',
            closingTime: storeData.closingTime || '22:00',
            imageUrl: storeData.imageUrl || '',
          });
        }
      }
    }
    fetchStore();
  }, [user, firestore, reset]);

  async function onSubmit(values: z.infer<typeof storeSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create or update a store.',
      });
      return;
    }

    try {
      // The document ID for the dispensary is the same as the vendor's UID
      const privateDispensaryDocRef = doc(firestore, 'users', user.uid, 'dispensaries', user.uid);
      const publicDispensaryDocRef = doc(firestore, 'dispensaries', user.uid);
      
      const dataToSave = {
        vendorId: user.uid,
        id: user.uid,
        slug: values.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
        ...values,
        updatedAt: serverTimestamp(),
      };
      
      // Write to both private and public collections
      setDocumentNonBlocking(privateDispensaryDocRef, dataToSave, { merge: true });
      setDocumentNonBlocking(publicDispensaryDocRef, dataToSave, { merge: true });

      toast({
        title: 'Store Updated',
        description: 'Your store information has been saved successfully.',
      });
      reset(values); // Resets the form's 'dirty' state
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
  }
  
  if (isUserLoading) {
      return (
          <div>
            <h1 className="text-3xl font-bold mb-6">My Store</h1>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    {/* Add more skeletons */}
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
      )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Store</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Dispensary Information</CardTitle>
              <CardDescription>Manage your public-facing store details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl><Input placeholder="Buds & Blooms" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="zipCode" render={({ field }) => (<FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="90210" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="openingTime" render={({ field }) => (<FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="closingTime" render={({ field }) => (<FormItem><FormLabel>Closing Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
