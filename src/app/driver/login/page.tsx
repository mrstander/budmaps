
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MapPin, Download, Smartphone, Share, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function DriverLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back, Driver!",
      });
      router.push('/driver/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
              <CardTitle>Driver Login</CardTitle>
              <CardDescription>Enter your credentials to access your driver dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="driver@example.com" {...field} />
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
                    {loading ? 'Logging in...' : 'Log In as Driver'}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col items-center space-y-4">
              <Button variant="outline" className="w-full" onClick={() => setIsInstallDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Install App on Your Phone
              </Button>
               <div className="text-sm text-muted-foreground">
                  Want to be a driver?{' '}
                  <Link href="/driver/register" passHref>
                      <span className="underline cursor-pointer">Register here</span>
                  </Link>
               </div>
               <div className="text-sm text-muted-foreground">
                  Not a driver?{' '}
                  <Link href="/login" passHref>
                      <span className="underline cursor-pointer">Login as a user</span>
                  </Link>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      <AlertDialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Smartphone /> Install the Driver App
            </AlertDialogTitle>
            <AlertDialogDescription>
              Follow these simple steps to add the app to your phone's home screen for easy access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <h3 className="font-semibold mb-2">For iOS / iPhone:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open this page in the <span className="font-semibold text-foreground">Safari</span> browser.</li>
                <li>Tap the 'Share' button (<Share className="inline h-4 w-4" />) in the browser menu.</li>
                <li>Scroll down and tap '<span className="font-semibold text-foreground">Add to Home Screen</span>'.</li>
                <li>Confirm by tapping '<span className="font-semibold text-foreground">Add</span>'.</li>
              </ol>
            </div>
             <div>
              <h3 className="font-semibold mb-2">For Android:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open this page in the <span className="font-semibold text-foreground">Chrome</span> browser.</li>
                <li>Tap the three-dot menu (<MoreVertical className="inline h-4 w-4" />) to open browser settings.</li>
                <li>Tap '<span className="font-semibold text-foreground">Install App</span>' or '<span className="font-semibold text-foreground">Add to Home Screen</span>'.</li>
                <li>Follow the on-screen prompts to install.</li>
              </ol>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
