

'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ShoppingCart, Ban, Plus, Minus, X } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

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

export default function CartPage() {
  const { cart, groupedByDispensary, addToCart, decrementItem, removeFromCart, itemCount } = useCart();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);
  const canShop = userData?.role === 'user' || !user;

  const handleCheckout = () => {
    if (!user) {
        router.push('/login?redirect=/checkout');
    } else {
        router.push('/checkout');
    }
  }

  if (!canShop && user) {
    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <Ban className="w-24 h-24 text-muted-foreground/30 mb-6" />
                    <h1 className="text-3xl font-bold mb-2">Cart Not Available</h1>
                    <p className="text-muted-foreground mb-6">Your account type ({userData?.role}) is not permitted to shop.</p>
                    <Button asChild>
                        <Link href="/">Return Home</Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    )
  }

  if (itemCount === 0) {
    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <ShoppingCart className="w-24 h-24 text-muted-foreground/30 mb-6" />
                    <h1 className="text-3xl font-bold mb-2">Your Cart is Empty</h1>
                    <p className="text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet.</p>
                    <Button asChild>
                        <Link href="/">Start Shopping</Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    )
  }
  
  const orderSummaries = Object.entries(groupedByDispensary).map(([slug, items]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
    return {
      dispensary: items[0].dispensary,
      items,
      subtotal
    };
  });
  
  const grandTotal = orderSummaries.reduce((sum, summary) => sum + summary.subtotal, 0);


  return (
    <div className="flex flex-col min-h-dvh bg-muted/20 text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mb-8">My Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {orderSummaries.map(summary => {
                const { imageUrl: dispensaryImageUrl, imageHint: dispensaryImageHint } = getPlaceholderImage(summary.dispensary.imageId || 'dispensary-1');
                return (
                    <Card key={summary.dispensary.slug}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Image src={summary.dispensary.imageUrl || dispensaryImageUrl} alt={summary.dispensary.name} width={40} height={40} className="rounded-md border" data-ai-hint={dispensaryImageHint} />
                                <h3 className="font-semibold text-xl">{summary.dispensary.name}</h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {summary.items.map((cartItem, index) => {
                                    const { imageUrl: placeholderImageUrl, imageHint } = getPlaceholderImage(cartItem.product.imageId);
                                    const finalImageUrl = cartItem.product.imageUrl || placeholderImageUrl;
                                    return (
                                        <div key={`${cartItem.product.id}-${cartItem.product.weight}-${index}`} className="flex items-start gap-4">
                                            <Image src={finalImageUrl} alt={cartItem.product.name} width={80} height={80} className="rounded-md border" data-ai-hint={imageHint} />
                                            <div className="flex-grow">
                                                <p className="font-medium">{cartItem.product.name}</p>
                                                <p className="text-sm text-muted-foreground">{cartItem.product.weight ? `${cartItem.product.weight} - ` : ''}R{(cartItem.product.price || 0).toFixed(2)}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => decrementItem(cartItem.product.id, cartItem.product.weight)}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="font-medium text-sm w-8 text-center">{cartItem.quantity}</span>
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addToCart(cartItem.product, cartItem.dispensary)}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                 <p className="font-semibold">R{((cartItem.product.price || 0) * cartItem.quantity).toFixed(2)}</p>
                                                 <Button variant="ghost" size="icon" className="w-8 h-8 mt-2 text-muted-foreground" onClick={() => removeFromCart(cartItem.product.id, cartItem.product.weight)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
          </div>
           <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p>R{grandTotal.toFixed(2)}</p>
                  </div>
                   <div className="flex justify-between">
                    <p className="text-muted-foreground">Delivery & Taxes</p>
                    <p>Calculated at checkout</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-4">
                <Button className="w-full" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
