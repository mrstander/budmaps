'use client';

import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/hooks/use-search';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Store, Package, Star, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const { dispensaries, products, isLoading, error } = useSearch(query);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <HeaderProvider />
            <main className="flex-grow container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">
                    {query ? `Search results for "${query}"` : 'Search results'}
                </h1>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-destructive font-medium">Error fetching results: {error.message}</p>
                    </div>
                ) : dispensaries.length === 0 && products.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">No results found for "{query}". Try searching for something else.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Dispensaries Section */}
                        {dispensaries.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Store className="h-6 w-6 text-primary" />
                                    <h2 className="text-2xl font-semibold">Dispensaries</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {dispensaries.map((dispensary) => (
                                        <Link key={dispensary.id} href={`/dispensary/${dispensary.slug || dispensary.id}`}>
                                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/50">
                                                <CardHeader className="p-0">
                                                    {dispensary.imageUrl ? (
                                                        <div className="relative h-48 w-full overflow-hidden rounded-t-xl">
                                                            <Image
                                                                src={dispensary.imageUrl}
                                                                alt={dispensary.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-48 w-full bg-muted flex items-center justify-center rounded-t-xl">
                                                            <Store className="h-12 w-12 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <CardTitle className="text-xl mb-2">{dispensary.name}</CardTitle>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{dispensary.city}, {dispensary.state}</span>
                                                    </div>
                                                    {dispensary.rating && (
                                                        <div className="flex items-center gap-1 text-sm font-medium">
                                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                            <span>{dispensary.rating} ({dispensary.reviews || 0} reviews)</span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Products Section */}
                        {products.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Package className="h-6 w-6 text-primary" />
                                    <h2 className="text-2xl font-semibold">Products</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {products.map((product) => (
                                        <Card key={product.id} className="hover:shadow-md transition-shadow h-full border-border/50 flex flex-col">
                                            <div className="relative h-48 w-full overflow-hidden rounded-t-xl bg-muted">
                                                {product.imageUrl ? (
                                                    <Image
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <Package className="h-10 w-10 text-muted-foreground" />
                                                    </div>
                                                )}
                                                {product.isHotDeal && (
                                                    <Badge className="absolute top-2 right-2 bg-yellow-400 text-black hover:bg-yellow-500 font-bold border-none uppercase text-[10px] tracking-wider">
                                                        Hot Deal
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardHeader className="p-4 pb-0">
                                                <Badge variant="outline" className="w-fit mb-2 text-[10px] uppercase tracking-wider">{product.category}</Badge>
                                                <CardTitle className="text-lg leading-tight line-clamp-2">{product.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 flex-grow">
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                                    {product.description || 'No description available'}
                                                </p>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <span className="text-lg font-bold">
                                                        ${product.price?.toFixed(2) || (product.pricing && product.pricing[0]?.price.toFixed(2))}
                                                    </span>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="p-4 pt-0">
                                                <Button variant="outline" asChild className="w-full">
                                                    <Link href={`/dispensary/${product.dispensaryId || 'unknown'}`}>
                                                        View Dispensary
                                                    </Link>
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
