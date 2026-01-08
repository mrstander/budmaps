'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Must be a valid URL'),
  openingTime: z.string().min(1, 'Opening time is required'),
  closingTime: z.string().min(1, 'Closing time is required'),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export default function AddStoreForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      address: '',
      suburb: '',
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

  const { formState: { isSubmitting }, reset } = form;

  async function onSubmit(values: z.infer<typeof storeSchema>) {
    if (!user) return;

    try {
      // Create a new document reference in both the public and private collections.
      // Firestore will generate a unique ID.
      const privateDispensaryDocRef = doc(collection(firestore, 'users', user.uid, 'dispensaries'));
      const publicDispensaryDocRef = doc(firestore, 'dispensaries', privateDispensaryDocRef.id);
      
      const dataToSave = {
        ...values,
        vendorId: user.uid,
        id: privateDispensaryDocRef.id,
        slug: values.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Write to both private and public collections
      setDocumentNonBlocking(privateDispensaryDocRef, dataToSave, { merge: false });
      setDocumentNonBlocking(publicDispensaryDocRef, dataToSave, { merge: false });

      toast({
        title: 'Store Added',
        description: `${values.name} has been created.`,
      });
      reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to add store',
        description: error.message || 'An unknown error occurred.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Add a New Store</CardTitle>
            <CardDescription>Fill out the details for your new dispensary location.</CardDescription>
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input placeholder="e.g., Woodstock" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding Store...' : 'Add Store'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

    