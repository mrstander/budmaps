
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const resetSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ResetPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSubmitted(true);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for instructions.",
      });
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
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              {submitted 
                ? "If an account with that email exists, we've sent a password reset link."
                : "Enter your email address and we will send you a link to reset your password."
              }
            </CardDescription>
          </CardHeader>
          {!submitted && (
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
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
                          <Input placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          )}
          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              <Link href="/login" passHref>
                <span className="underline cursor-pointer">Back to Log In</span>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
