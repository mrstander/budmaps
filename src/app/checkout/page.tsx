
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Landmark, ShoppingCart, Truck, Ban } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem, CartItem, User as UserType } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const getPlaceholderImage = (id?: string) => {
  if (!id) {
    return { imageUrl: 'https://picsum.photos/seed/default/200/200', imageHint: 'placeholder' };
  }
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/default/200/200', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

const deliverySchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
});

export default function CheckoutPage() {
  const { cart, groupedByDispensary, clearCart } = useCart();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<UserType>(userDocRef);
  const canShop = userData?.role === 'user' || !user;

  const form = useForm<z.infer<typeof deliverySchema>>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });
  
  useEffect(() => {
    if (userData) {
      form.reset({
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zipCode: userData.zipCode || '',
      });
    }
  }, [userData, form]);

  const DELIVERY_FEE = 50.00;
  const COMMISSION_RATE = 0.055;

  const handlePlaceOrder = async (values: z.infer<typeof deliverySchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to place an order.' });
      router.push('/login?redirect=/checkout');
      return;
    }
    if (cart.length === 0 || !firestore) return;
    
    setIsLoading(true);

    try {
      const orderWriteBatch = writeBatch(firestore);
      
      for (const dispensarySlug in groupedByDispensary) {
          const items: CartItem[] = groupedByDispensary[dispensarySlug];
          const dispensary = items[0].dispensary;

          const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
          const taxes = subtotal * 0.08; 
          const commission = subtotal * COMMISSION_RATE;
          const vendorPayout = subtotal - commission;
          const total = subtotal + taxes + DELIVERY_FEE;

          const orderItems: OrderItem[] = items.map(cartItem => ({
              productId: cartItem.product.id,
              name: cartItem.product.name,
              weight: cartItem.product.weight!,
              price: cartItem.product.price!,
              quantity: cartItem.quantity,
              imageUrl: cartItem.product.imageUrl || getPlaceholderImage(cartItem.product.imageId).imageUrl,
              imageHint: getPlaceholderImage(cartItem.product.imageId).imageHint,
          }));
          
          const dispensaryId = dispensary.id!;
          const dispensaryOrderRef = doc(collection(firestore, `dispensaries/${dispensaryId}/orders`));
          const userOrderRef = doc(collection(firestore, `users/${user.uid}/orders`), dispensaryOrderRef.id);

          const newOrder: Order = {
              id: dispensaryOrderRef.id,
              dispensaryId: dispensaryId,
              dispensaryName: dispensary.name,
              dispensaryState: dispensary.state,
              customerId: user.uid,
              customerName: user.displayName || user.email || 'Anonymous',
              customerEmail: user.email!,
              items: orderItems,
              subtotal,
              taxes,
              deliveryFee: DELIVERY_FEE,
              commission,
              vendorPayout,
              total,
              paymentMethod: 'cash',
              status: 'placed',
              createdAt: serverTimestamp(),
              address: values.address,
              city: values.city,
              state: values.state,
              zipCode: values.zipCode,
          };

          orderWriteBatch.set(dispensaryOrderRef, newOrder);
          orderWriteBatch.set(userOrderRef, newOrder);
      }
      
      await orderWriteBatch.commit();
      clearCart();
      router.push('/order-confirmation');

    } catch (error: any) {
        console.error("Error during checkout process:", error);
        toast({
            variant: 'destructive',
            title: 'Checkout Failed',
            description: error.message || 'An unexpected error occurred.',
        });
        setIsLoading(false);
    } 
  };


  if (!canShop && user) {
    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <Ban className="w-24 h-24 text-muted-foreground/30 mb-6" />
                    <h1 className="text-3xl font-bold mb-2">Checkout Not Available</h1>
                    <p className="text-muted-foreground mb-6">Your account type ({userData?.role}) is not permitted to place orders.</p>
                    <Button asChild>
                        <Link href="/">Return Home</Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    )
  }

  if (cart.length === 0) {
    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <ShoppingCart className="w-24 h-24 text-muted-foreground/30 mb-6" />
                    <h1 className="text-3xl font-bold mb-2">Your Cart is Empty</h1>
                    <p className="text-muted-foreground mb-6">You can't checkout with an empty cart.</p>
                    <Button asChild>
                        <Link href="/">Start Shopping</Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  const taxes = subtotal * 0.08;
  const numDispensaries = Object.keys(groupedByDispensary).length;
  const totalDeliveryFee = DELIVERY_FEE * numDispensaries;
  const grandTotal = subtotal + taxes + totalDeliveryFee;

  return (
    <div className="flex flex-col min-h-dvh bg-muted/20 text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mb-8">Checkout</h1>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handlePlaceOrder)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Delivery Address</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="address" render={({field}) => <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage/></FormItem>} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="city" render={({field}) => <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="state" render={({field}) => <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage/></FormItem>} />
                        <FormField control={form.control} name="zipCode" render={({field}) => <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="90210" {...field} /></FormControl><FormMessage/></FormItem>} />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>2. Payment Method</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex flex-col items-center justify-between rounded-md border-2 border-primary bg-popover p-4">
                            <Landmark className="mb-3 h-6 w-6" />
                            Cash on Delivery
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground p-2 rounded-lg bg-accent/30 flex items-center gap-2">
                        <Truck className="h-4 w-4"/>
                        <span>Please have exact change ready for your driver.</span>
                    </div>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {cart.map((cartItem, index) => {
                      const { imageUrl, imageHint } = getPlaceholderImage(cartItem.product.imageId);
                      return (
                        <div key={`${cartItem.product.id}-${cartItem.product.weight}-${index}`} className="flex items-center gap-4">
                          <Image src={cartItem.product.imageUrl || imageUrl} alt={cartItem.product.name} width={48} height={48} className="rounded-md border" data-ai-hint={imageHint} />
                          <div className="flex-grow">
                            <p className="font-medium text-sm">{cartItem.product.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {cartItem.quantity}</p>
                          </div>
                          <div className="text-right text-sm font-semibold">
                            <p>R{((cartItem.product.price || 0) * cartItem.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Subtotal</p>
                      <p>R{subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Delivery ({numDispensaries} {numDispensaries > 1 ? 'orders' : 'order'})</p>
                      <p>R{totalDeliveryFee.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Est. Taxes</p>
                      <p>R{taxes.toFixed(2)}</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-4">
                 <div className="flex justify-between font-bold text-lg">
                    <p>Grand Total</p>
                    <p>R{grandTotal.toFixed(2)}</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Place Order'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        </form>
        </Form>
      </main>
      <Footer />
    </div>
  );
}
