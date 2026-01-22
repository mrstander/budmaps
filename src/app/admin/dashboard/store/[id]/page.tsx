
'use client';

import { useEffect, useState, use } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Dispensary } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Switch } from '@/components/ui/switch';

const dailyHoursSchema = z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
  isOpen: z.boolean(),
});

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Must be a valid URL'),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  hours: z.array(dailyHoursSchema),
});

const defaultHours = [
  { day: 'Monday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'Tuesday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'Wednesday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'Thursday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'Friday', open: '09:00', close: '22:00', isOpen: true },
  { day: 'Saturday', open: '10:00', close: '20:00', isOpen: true },
  { day: 'Sunday', open: '10:00', close: '18:00', isOpen: false },
];


export default function AdminEditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
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
      imageUrl: '',
      hours: defaultHours,
    },
  });

  const { formState: { isSubmitting, isDirty, isLoading: isFormLoading }, reset, control } = form;
  const unwrappedParams = use(params);
  const storeId = unwrappedParams.id;

  const { fields } = useFieldArray({
    control,
    name: "hours",
  });

  // Store the vendorId once fetched
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      if (user && firestore && storeId) {
        const dispensaryDocRef = doc(firestore, 'dispensaries', storeId);
        const docSnap = await getDoc(dispensaryDocRef);

        if (docSnap.exists()) {
          const storeData = docSnap.data() as Dispensary;
          reset({
            ...storeData,
            hours: storeData.hours && storeData.hours.length === 7 ? storeData.hours : defaultHours,
          });
          setVendorId(storeData.vendorId || null);
        } else {
          toast({ variant: 'destructive', title: 'Not Found', description: 'The requested store could not be found.' });
          router.push('/admin/dashboard/stores');
        }
      }
    }
    if (!isUserLoading) {
      fetchStore();
    }
  }, [user, firestore, reset, storeId, toast, router, isUserLoading]);

  async function onSubmit(values: z.infer<typeof storeSchema>) {
    if (!user || !vendorId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot update store. Admin user or original vendor ID is missing.',
      });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      const publicDispensaryDocRef = doc(firestore, 'dispensaries', storeId);
      const privateDispensaryDocRef = doc(firestore, 'users', vendorId, 'dispensaries', storeId);

      const dataToSave = {
        ...values,
        slug: values.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
        updatedAt: serverTimestamp(),
      };

      batch.update(publicDispensaryDocRef, dataToSave);
      batch.update(privateDispensaryDocRef, dataToSave);

      await batch.commit();

      toast({
        title: 'Store Updated',
        description: 'The store information has been saved successfully.',
      });
      reset(values); // This marks the form as no longer dirty
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
  }

  if (isUserLoading || isFormLoading) {
    return (
      <div>
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard/stores">Stores</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Edit Store</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
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
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard/stores">Stores</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{form.getValues('name') || 'Edit Store'}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Edit Dispensary (Admin)</CardTitle>
              <CardDescription>Manage the public-facing store details for {form.getValues('name')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="Buds & Blooms" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>Image URL</FormLabel><FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Opening Hours</h3>
                {fields.map((field, index) => {
                  const dayValue = form.watch(`hours.${index}`);
                  return (
                    <div key={field.id} className="grid grid-cols-4 items-center gap-4 p-3 rounded-lg border">
                      <FormLabel className="col-span-4 sm:col-span-1">{field.day}</FormLabel>
                      <div className="col-span-4 sm:col-span-3 grid grid-cols-3 gap-4 items-center">
                        <FormField
                          control={control}
                          name={`hours.${index}.open`}
                          render={({ field }) => <FormItem><FormControl><Input type="time" {...field} disabled={!dayValue.isOpen} /></FormControl></FormItem>}
                        />
                        <FormField
                          control={control}
                          name={`hours.${index}.close`}
                          render={({ field }) => <FormItem><FormControl><Input type="time" {...field} disabled={!dayValue.isOpen} /></FormControl></FormItem>}
                        />
                        <FormField
                          control={control}
                          name={`hours.${index}.isOpen`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-end space-x-2">
                              <FormLabel htmlFor={`is-open-admin-${index}`} className="text-sm font-normal">
                                {dayValue.isOpen ? "Open" : "Closed"}
                              </FormLabel>
                              <FormControl>
                                <Switch
                                  id={`is-open-admin-${index}`}
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )
                })}
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
