
'use client';

import { useState, useEffect, useMemo } from 'react';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Product, Dispensary } from '@/lib/types';
import { collection, collectionGroup, getDocs, getFirestore, query, where, doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Package, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDispensaries } from '@/hooks/use-dispensaries';
import DealProductCard from '@/components/deal-product-card';

// Extend Product type to include dispensary details
type ProductWithDispensary = Product & { dispensary: Dispensary };

export default function DealsPage() {
  const firestore = useFirestore();
  const [saleProducts, setSaleProducts] = useState<ProductWithDispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { dispensaries, isLoading: dispensariesLoading } = useDispensaries();

  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedSuburb, setSelectedSuburb] = useState<string>('all');
  
  useEffect(() => {
    async function fetchSaleProducts() {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const productsQuery = query(collectionGroup(firestore, 'products'), where('salePrice', '>', 0));
        const productsSnapshot = await getDocs(productsQuery);
        
        const productsWithDispensaries: ProductWithDispensary[] = [];

        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data() as Product;
          const dispensaryId = productDoc.ref.parent.parent?.id;

          if (dispensaryId) {
            const dispensaryRef = doc(firestore, 'dispensaries', dispensaryId);
            const dispensarySnap = await getDoc(dispensaryRef);
            if (dispensarySnap.exists()) {
              const dispensaryData = dispensarySnap.data() as Dispensary;
              productsWithDispensaries.push({ 
                ...productData, 
                id: productDoc.id, 
                dispensaryId: dispensaryId,
                dispensary: dispensaryData 
              });
            }
          }
        }
        setSaleProducts(productsWithDispensaries);
      } catch (error) {
        console.error("Error fetching sale products:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSaleProducts();
  }, [firestore]);

  const states = useMemo(() => {
    if (dispensariesLoading) return [];
    return ['all', ...Array.from(new Set(dispensaries.map(d => d.state).filter(Boolean))) as string[]];
  }, [dispensaries, dispensariesLoading]);

  const suburbs = useMemo(() => {
    if (dispensariesLoading || selectedState === 'all') return [];
    const suburbSet = new Set(
        dispensaries
            .filter(d => d.state === selectedState && d.suburb)
            .map(d => d.suburb!)
    );
    return ['all', ...Array.from(suburbSet)];
  }, [dispensaries, selectedState, dispensariesLoading]);

  useEffect(() => {
    // Reset suburb when state changes
    setSelectedSuburb('all');
  }, [selectedState]);


  const filteredProducts = useMemo(() => {
    return saleProducts.filter(p => {
        const stateMatch = selectedState === 'all' || p.dispensary.state === selectedState;
        const suburbMatch = selectedSuburb === 'all' || p.dispensary.suburb === selectedSuburb;
        return stateMatch && suburbMatch;
    })
  }, [saleProducts, selectedState, selectedSuburb]);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Deals</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mt-4 flex items-center gap-3">
            <Tag className="w-8 h-8 text-primary"/>
            All Deals
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            The best prices on your favorite cannabis products.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <Select value={selectedState} onValueChange={setSelectedState} disabled={dispensariesLoading}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by state..." />
                </SelectTrigger>
                <SelectContent>
                   {states.map(state => <SelectItem key={state} value={state}>{state === 'all' ? 'All States' : state}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedSuburb} onValueChange={setSelectedSuburb} disabled={!selectedState || selectedState === 'all' || suburbs.length <= 1}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by suburb..." />
                </SelectTrigger>
                <SelectContent>
                   {suburbs.map(suburb => <SelectItem key={suburb} value={suburb}>{suburb === 'all' ? 'All Suburbs' : suburb}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                ))}
            </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map((product) => (
                <DealProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-lg border-2 border-dashed">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">No Deals Found</h2>
            <p className="text-muted-foreground mt-2">
              There are currently no products on sale matching your criteria. Check back soon!
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
