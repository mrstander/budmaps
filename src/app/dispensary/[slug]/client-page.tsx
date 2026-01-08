
'use client';

import { Dispensary, Product } from '@/lib/types';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Star, MapPin, Clock, Phone, Globe, ShoppingCart, Info, Wind, Zap, UtensilsCrossed, HelpCircle, Leaf, Droplets, XCircle, PowerOff, Compass } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import ProductFilters from '@/components/product-filters';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format, getDay } from 'date-fns';
import { isDispensaryOpen } from '@/lib/is-dispensary-open';
import WeedMarker from '@/components/weed-marker';

const getPlaceholderImage = (id: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    // A default placeholder for products if no specific one is found
    return { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

const isSaleActive = (product: Product) => {
    // Check for a product-level sale
    if (product.salePrice && product.salePrice > 0) return true;
    
    // Check for a tier-level sale in edible pricing
    if (product.type === 'Edible' && product.ediblePricing) {
        return product.ediblePricing.some(tier => tier.salePrice && tier.salePrice > 0);
    }
    
    // Check for a tier-level sale in soda pricing
    if (product.type === 'Soda' && product.sodaPricing) {
        return product.sodaPricing.some(tier => tier.salePrice && tier.salePrice > 0);
    }
    
    return false;
}

const ProductCard = ({ product, dispensary, isOpen }: { product: Product; dispensary: Dispensary; isOpen: boolean }) => {
    const { addToCart } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData } = useDoc(userDocRef);
    const canShop = !userData || userData.role === 'user';

    const { imageUrl: placeholderUrl, imageHint } = getPlaceholderImage(product.imageId || 'category-flower');
    const imageUrl = product.imageUrl || placeholderUrl;
    const productUrl = `/dispensary/${dispensary.slug}/product/${product.slug || product.id}`;
    
    const onSale = isSaleActive(product);
    
    let displayPrice: number | undefined;
    let originalPrice: number | undefined;
    
    let totalStock = useMemo(() => {
        if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
            return product.pricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
            return product.ediblePricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            return product.sodaPricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else {
            return product.stock || 0;
        }
    }, [product]);
    
    if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
        const firstTier = product.pricing[0];
        displayPrice = onSale && product.salePrice ? product.salePrice : firstTier.price;
        if(onSale && product.salePrice) originalPrice = firstTier.price;
    } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
        const firstTier = product.ediblePricing[0];
        displayPrice = firstTier.salePrice || firstTier.price;
        if(firstTier.salePrice) originalPrice = firstTier.price;
    } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
        const firstTier = product.sodaPricing[0];
        displayPrice = firstTier.salePrice || firstTier.price;
        if(firstTier.salePrice) originalPrice = firstTier.price;
    } else {
        displayPrice = onSale ? product.salePrice : product.price;
        if(onSale) originalPrice = product.price;
    }


    const handleAddToCart = () => {
      const price = onSale ? product.salePrice! : product.price || product.pricing?.[0]?.price || 0;
      const weight = product.weight || product.pricing?.[0]?.weight || '';
      
      addToCart({ ...product, price, weight, stock: product.stock }, dispensary);
      toast({
        title: "Added to cart",
        description: `${product.name} from ${dispensary.name}`,
      });
    };
    
    const showOptionsButton = product.type === 'Flower' || 
                              (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) ||
                              (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0);

    const isActionDisabled = totalStock <= 0 || !canShop || !isOpen;

    return (
        <Card className="overflow-hidden flex flex-col group">
            <Link href={productUrl} className='contents'>
                <div className="aspect-square relative overflow-hidden">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
                     {onSale && (
                        <Badge className="absolute top-2 left-2" variant="destructive">SALE</Badge>
                    )}
                </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                    <div className='flex justify-end'>
                      <p className="text-sm text-muted-foreground">{product.type}</p>
                    </div>
                    <h3 className="font-semibold text-lg flex-grow mt-1">{product.name}</h3>
                    
                </CardContent>
            </Link>
            <div className="p-4 pt-0">
              <Separator className="my-3" />
               <div className="flex justify-between items-center font-semibold mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${onSale ? 'text-destructive' : ''}`}>
                      {showOptionsButton
                        ? `From R${(displayPrice || 0).toFixed(2)}`
                        : `R${(displayPrice || 0).toFixed(2)}`
                      }
                    </span>
                    {onSale && originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                             {`R${originalPrice.toFixed(2)}`}
                        </span>
                    )}
                  </div>
                  
              </div>
              {showOptionsButton ? (
                <Button className="w-full" asChild disabled={isActionDisabled}>
                  <Link href={productUrl} className={isActionDisabled ? 'pointer-events-none' : ''}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>
                    {totalStock <= 0 ? 'Out of Stock' : !isOpen ? 'Closed' : canShop ? 'Select options' : 'Not available'}
                  </Link>
                </Button>
              ) : (
                <Button className="w-full" onClick={handleAddToCart} disabled={isActionDisabled}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>
                    {totalStock <= 0 ? 'Out of Stock' : !isOpen ? 'Closed' : canShop ? 'Add to cart' : 'Not available'}
                </Button>
              )}
            </div>
        </Card>
    );
};

export default function DispensaryDetailClient({ dispensary, products }: { dispensary: Dispensary, products: Product[] }) {
    const { imageUrl: heroPlaceholderUrl, imageHint: heroPlaceholderHint } = getPlaceholderImage('dispensary-1');
    const heroImageUrl = dispensary.imageUrl || heroPlaceholderUrl;
    const heroImageHint = dispensary.imageUrl ? 'dispensary interior' : heroPlaceholderHint;
    
    const searchParams = useSearchParams();
    const categoryQuery = searchParams.get('category');
    
    const isOpen = useMemo(() => isDispensaryOpen(dispensary), [dispensary]);

    const initialCategoryFilter = useMemo(() => {
        if (!categoryQuery) return new Set<string>();
        if (categoryQuery === 'vapes') return new Set(['Vape']);
        if (categoryQuery === 'edibles') return new Set(['Edible']);
        if (categoryQuery === 'concentrates') return new Set(['Concentrate']);
        if (categoryQuery === 'prerolls') return new Set(['Pre-roll']);
        if (categoryQuery === 'flower') return new Set(['Flower']);
        if (categoryQuery === 'soda') return new Set(['Soda']);
        return new Set<string>();
    }, [categoryQuery]);

    const initialFilteredProducts = useMemo(() => {
        if (categoryQuery === 'cbd') {
            return products.filter(p => p.cbd && p.cbd > 0);
        }
        if (initialCategoryFilter.size > 0) {
            return products.filter(p => initialCategoryFilter.has(p.type));
        }
        return products;
    }, [products, categoryQuery, initialCategoryFilter]);

    const [filteredProducts, setFilteredProducts] = useState(initialFilteredProducts);

    // Handle updates when the initial filters or products change
    useEffect(() => {
        setFilteredProducts(initialFilteredProducts);
    }, [initialFilteredProducts]);

    const today = format(new Date(), 'EEEE');

    const mapQuery = useMemo(() => {
        return encodeURIComponent(`${dispensary.name}, ${dispensary.address}, ${dispensary.city}, ${dispensary.state}`);
    }, [dispensary]);

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    return (
        <main className="flex-grow">
            <div className="relative h-64 md:h-80 w-full flex items-center justify-center">
                <Image src={heroImageUrl} alt={dispensary.name} fill className="object-cover" data-ai-hint={heroImageHint} />
                <div className="absolute inset-0 bg-black/50" />
                 <div className="relative text-center z-10 p-4">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-headline text-white">{dispensary.name}</h1>
                </div>
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="bg-card p-6 rounded-xl shadow-lg -mt-24 relative z-10">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-foreground">{dispensary.rating || 4.5}</span>
                                    <span>({dispensary.reviews || 0} reviews)</span>
                                </div>
                                <span>•</span>
                                <span>{dispensary.type || 'Dispensary'}</span>
                            </div>
                             <div className={cn("flex items-center gap-2 font-semibold", isOpen ? "text-green-600" : "text-destructive")}>
                                {isOpen ? <PowerOff className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                <span>{isOpen ? "Open Now" : "Currently Closed"}</span>
                            </div>
                            <Separator />
                            <div className="space-y-2 text-sm">
                               <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {dispensary.address}, {dispensary.suburb}, {dispensary.city}</p>
                               <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {dispensary.phone}</p>
                               <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> <a href={dispensary.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{dispensary.website}</a></p>
                            </div>
                        </div>
                        <div className="relative w-full h-64 md:h-full rounded-lg overflow-hidden border">
                            {googleMapsApiKey && googleMapsApiKey !== "YOUR_GOOGLE_MAPS_API_KEY_HERE" ? (
                                 <iframe
                                    className="w-full h-full"
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${mapQuery}`}>
                                </iframe>
                            ) : (
                                <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-center p-4">
                                     <Compass className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold">Map Unavailable</h3>
                                    <p className="text-sm text-muted-foreground">Please configure a Google Maps API key to display the map.</p>
                                </div>
                            )}
                        </div>
                   </div>
                </Card>

                <Tabs defaultValue="menu" className="mt-8">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="menu">Menu</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    </TabsList>
                    <TabsContent value="menu" className="mt-6">
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="md:col-span-1">
                                <ProductFilters 
                                    products={products} 
                                    onFilterChange={setFilteredProducts}
                                    initialCategoryFilter={initialCategoryFilter}
                                    initialCbdFilter={categoryQuery === 'cbd'}
                                />
                            </div>
                            <div className="md:col-span-3">
                                {filteredProducts && filteredProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredProducts.map(product => (
                                            <ProductCard key={product.id} product={product} dispensary={dispensary} isOpen={isOpen} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 col-span-full">
                                        <h2 className="text-2xl font-semibold">No Products Found</h2>
                                        <p className="text-muted-foreground mt-2">The vendor has not added any items matching your criteria.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="details" className="mt-6">
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <div>
                                    <h3 className="font-semibold">About {dispensary.name}</h3>
                                    <p className="text-muted-foreground mt-1">Welcome to {dispensary.name}! We are a premier cannabis dispensary located in the heart of {dispensary.city}. We pride ourselves on offering a wide selection of high-quality cannabis products to both medical and recreational customers. Our knowledgeable staff is here to help you find the perfect product to meet your needs.</p>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold">Hours</h3>
                                     <div className="mt-2 space-y-1">
                                        {dispensary.hours?.map(h => (
                                            <div key={h.day} className={cn("flex justify-between items-center text-sm", h.day === today && "font-bold text-primary")}>
                                                <span>{h.day}</span>
                                                <span>{h.isOpen ? `${h.open} - ${h.close}` : 'Closed'}</span>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                                 <Separator />
                                <div>
                                    <h3 className="font-semibold">Contact</h3>
                                    <p className="flex items-center gap-2 mt-1"><Globe className="w-4 h-4 text-primary" /> <a href={dispensary.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{dispensary.website}</a></p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="reviews" className="mt-6">
                        <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
                        <p>No reviews yet. Be the first to leave a review!</p>
                    </TabsContent>
                </Tabs>
            </div>
      </main>
    );
}
