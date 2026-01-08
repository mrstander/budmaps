
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

const addressSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
});

export default function SettingsPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: user?.email || '' },
  });
  
  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: { address: '', city: '', state: '', zipCode: '' },
  });

  const { formState: { isSubmitting: isProfileSubmitting, isDirty: isProfileDirty }, reset: resetProfile } = profileForm;
  const { formState: { isSubmitting: isAddressSubmitting, isDirty: isAddressDirty }, reset: resetAddress } = addressForm;
  
  useEffect(() => {
    async function loadUserData() {
      if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          resetProfile({ email: userData.email });
          resetAddress({
            address: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || '',
          });
        }
      }
    }
    if (!isUserLoading) {
      loadUserData();
    }
  }, [user, firestore, isUserLoading, resetProfile, resetAddress]);


  const onUpdateProfile = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;

    if (values.email !== user.email) {
      try {
        await updateEmail(user, values.email);
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, { email: values.email });

        toast({ title: 'Email Updated', description: `Your email has been changed to ${values.email}.` });
        resetProfile({ email: values.email });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      }
    }
  };
  
  const onUpdateAddress = async (values: z.infer<typeof addressSchema>) => {
    if (!user || !firestore) return;
    
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, values);
      toast({ title: 'Address Updated', description: 'Your delivery address has been saved.' });
      resetAddress(values);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const onResetPassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for a link to reset your password.' });
    } catch(error: any) {
      toast({ variant: 'destructive', title: 'Request Failed', description: error.message });
    }
  };

  if (isUserLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline">Settings</h1>
      
      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onUpdateProfile)}>
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your account email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={profileForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isProfileSubmitting || !isProfileDirty}>
                {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Form {...addressForm}>
        <form onSubmit={addressForm.handleSubmit(onUpdateAddress)}>
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
              <CardDescription>Manage your default delivery address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={addressForm.control} name="address" render={({ field }) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage/></FormItem>} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={addressForm.control} name="city" render={({ field }) => <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage/></FormItem>} />
                <FormField control={addressForm.control} name="state" render={({ field }) => <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage/></FormItem>} />
                <FormField control={addressForm.control} name="zipCode" render={({ field }) => <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="90210" {...field} /></FormControl><FormMessage/></FormItem>} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isAddressSubmitting || !isAddressDirty}>
                {isAddressSubmitting ? 'Saving...' : 'Save Address'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Receive an email with a link to reset your password.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onResetPassword}>Send Password Reset Email</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
