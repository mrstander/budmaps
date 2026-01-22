'use client';

import { useState, useMemo } from 'react';
import { Product, Dispensary } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import ProductFilters from '@/components/product-filters';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, PackageX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface ProductsClientPageProps {
    initialProducts: (Product & { dispensary: Dispensary })[];
}

export default function ProductsClientPage({ initialProducts }: ProductsClientPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState(initialProducts);

    const finalProducts = useMemo(() => {
        if (!searchQuery.trim()) return filteredProducts;

        const query = searchQuery.toLowerCase().trim();
        return filteredProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.dispensary.name.toLowerCase().includes(query) ||
            p.type.toLowerCase().includes(query)
        );
    }, [filteredProducts, searchQuery]);

    return (
        <main className="flex-grow bg-slate-50/50">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden bg-white border-b pt-16 pb-20">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-3xl opacity-50" />

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 py-1 px-4 border-primary/20 bg-primary/5 text-primary rounded-full animate-in fade-in slide-in-from-left-4 duration-700">
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            Discover the best products
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            Marketplace
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                            Explore thousands of products from verified dispensaries. Shop by category, strain, or find your favorite local store.
                        </p>

                        <div className="relative group max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search products, dispensaries, or categories..."
                                className="pl-14 h-[72px] bg-white shadow-2xl shadow-primary/5 rounded-2xl border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-xl font-medium placeholder:text-muted-foreground/50 transition-all hover:shadow-primary/10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Desktop Sidebar Filters */}
                    <aside className="hidden lg:block w-80 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                        <div className="sticky top-28">
                            <ProductFilters
                                products={initialProducts}
                                onFilterChange={setFilteredProducts}
                            />
                        </div>
                    </aside>

                    {/* Mobile Filters Trigger */}
                    <div className="lg:hidden flex items-center justify-between mb-6">
                        <p className="text-sm font-bold text-muted-foreground">
                            {finalProducts.length} PRODUCTS FOUND
                        </p>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2 rounded-xl h-11 border-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Sort & Filter
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle>Filters</SheetTitle>
                                </SheetHeader>
                                <div className="mt-8">
                                    <ProductFilters
                                        products={initialProducts}
                                        onFilterChange={setFilteredProducts}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-grow">
                        <div className="hidden lg:flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black">{finalProducts.length} Results</h2>
                                {searchQuery && (
                                    <Badge variant="secondary" className="px-3 py-1">
                                        Searching: {searchQuery}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {finalProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                                {finalProducts.map((product, index) => (
                                    <div key={product.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${(index % 6) * 100}ms` }}>
                                        <ProductCard
                                            product={product}
                                            dispensary={product.dispensary}
                                            showDispensary={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-border/60">
                                <div className="bg-slate-50 p-8 rounded-full mb-8">
                                    <PackageX className="h-16 w-16 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-3xl font-black mb-3">No matching items</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto text-lg mb-8">
                                    We couldn't find any products matching your specific search or active filters.
                                </p>
                                <Button
                                    className="rounded-xl h-12 px-8 font-bold"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilteredProducts(initialProducts);
                                    }}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
