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
import { ProductCard } from '@/components/product-card';

const getPlaceholderImage = (id: string) => {
    const image = PlaceHolderImages.find(p => p.id === id);
    if (!image) {
        // A default placeholder for products if no specific one is found
        return { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
    }
    return { imageUrl: image.imageUrl, imageHint: image.imageHint };
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
                                </div>
                            </div>
                            <div className={cn("flex items-center gap-2 font-semibold", isOpen ? "text-green-600" : "text-destructive")}>
                                {isOpen ? <PowerOff className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                <span>{isOpen ? "Open Now" : "Currently Closed"}</span>
                            </div>

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
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="menu">Menu</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>

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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
