
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function VendorRegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setError(null);
    setLoading(true);
    if (!firestore) {
        setError("Firestore is not available.");
        setLoading(false);
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);
      
      // Add user to firestore with 'vendor' role
      const userDocRef = doc(firestore, "users", user.uid);
      batch.set(userDocRef, {
        id: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        role: 'vendor', // Assign 'vendor' role
      });
      
      await batch.commit();
      
      toast({
        title: "Vendor Account Created",
        description: "You have been successfully registered as a vendor. Please log in.",
      });
      router.push('/vendor/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">budmaps</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create a Vendor Account</CardTitle>
            <CardDescription>Join our platform as a vendor.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email</FormLabel>
                      <FormControl>
                        <Input placeholder="vendor@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Vendor Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex-col items-center">
            <div className="text-sm text-muted-foreground">
              Already have a vendor account?{' '}
              <Link href="/vendor/login" passHref>
                <span className="underline cursor-pointer">Log in</span>
              </Link>
            </div>
             <div className="mt-2 text-sm text-muted-foreground">
                Not a vendor?{' '}
                <Link href="/register" passHref>
                    <span className="underline cursor-pointer">Register as a user</span>
                </Link>
             </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
