
'use client';

import { useState, useMemo, useEffect } from 'react';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import type { Dispensary } from '@/lib/types';
import { notFound, useSearchParams, useParams } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { collection, getDocs, getFirestore, query, where, QueryConstraint } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

async function getDispensariesByRegion(
  stateSlug: string,
  citySlug?: string
): Promise<{ stateName: string, cityName: string | null, dispensaries: Dispensary[] }> {
    const stateName = stateSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const cityName = citySlug ? citySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : null;

    try {
        const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(firebaseApp);
        const dispensariesCol = collection(db, 'dispensaries');
        
        const queryConstraints: QueryConstraint[] = [where("state", "==", stateName)];
        if (cityName) {
            queryConstraints.push(where("city", "==", cityName));
        }

        const q = query(dispensariesCol, ...queryConstraints);
        const dispensarySnapshot = await getDocs(q);

        const dispensaryList = dispensarySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Dispensary));
        
        return { stateName, cityName, dispensaries: dispensaryList };
    } catch (error) {
        console.error("Error fetching dispensaries by region:", error);
        return { stateName, cityName, dispensaries: [] };
    }
}

const getPlaceholderImage = (id?: string) => {
  if (!id) {
    return { imageUrl: 'https://picsum.photos/seed/default/600/400', imageHint: 'placeholder' };
  }
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/default/600/400', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

export default function RegionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const slug = params.slug as string;
  const citySlug = searchParams.get('city');

  const [initialData, setInitialData] = useState<{ stateName: string; cityName: string | null; dispensaries: Dispensary[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuburb, setSelectedSuburb] = useState('all');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getDispensariesByRegion(slug, citySlug || undefined);
      setInitialData(data);
      setIsLoading(false);
    }
    fetchData();
  }, [slug, citySlug]);

  const availableSuburbs = useMemo(() => {
    if (!initialData) return [];
    const suburbs = new Set(
        initialData.dispensaries
            .filter(d => d.suburb)
            .map(d => d.suburb!)
    );
    return ['all', ...Array.from(suburbs)];
  }, [initialData]);

  const filteredDispensaries = useMemo(() => {
    if (!initialData) return [];
    return initialData.dispensaries.filter(dispensary => {
      const nameMatch = dispensary.name.toLowerCase().includes(searchTerm.toLowerCase());
      const suburbMatch = selectedSuburb === 'all' || dispensary.suburb === selectedSuburb;
      return nameMatch && suburbMatch;
    });
  }, [initialData, searchTerm, selectedSuburb]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <HeaderProvider />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-6 w-3/4 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-video w-full" />
                        <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!initialData) {
    // This could be a more specific error page or a simple message
    return notFound();
  }

  const { stateName, cityName, dispensaries } = initialData;
  const pageTitle = cityName ? `Weed dispensaries in ${cityName}` : `Weed dispensaries in ${stateName}`;
  const pageDescription = `Browse dispensaries in ${cityName ? `${cityName}, ${stateName}` : stateName}.`;

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
               {cityName ? (
                <>
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/region/${slug}`}>{stateName}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{cityName}</BreadcrumbPage>
                    </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                    <BreadcrumbPage>{stateName}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mt-4">
            {pageTitle}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {pageDescription}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-16 bg-background/80 backdrop-blur-sm z-10 py-4 -mx-4 px-4 border-b">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dispensaries by name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedSuburb} onValueChange={setSelectedSuburb} disabled={availableSuburbs.length <= 1}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by suburb..." />
                </SelectTrigger>
                <SelectContent>
                    {availableSuburbs.map(suburb => <SelectItem key={suburb} value={suburb}>{suburb === 'all' ? 'All Suburbs' : suburb}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>
        
        {filteredDispensaries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredDispensaries.map((dispensary) => {
              const { imageUrl, imageHint } = getPlaceholderImage(dispensary.imageId || 'dispensary-1');
              const displayImageUrl = dispensary.imageUrl || imageUrl;
              return (
                <Link key={dispensary.id} href={`/dispensary/${dispensary.slug || dispensary.id}`}>
                  <Card className="overflow-hidden group transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <Image src={displayImageUrl} alt={dispensary.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg">{dispensary.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        {dispensary.suburb ? `${dispensary.suburb}, ` : ''}{dispensary.city}, {dispensary.state}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Dispensaries Found</h2>
            <p className="text-muted-foreground mt-2">There are currently no dispensaries listed in this area.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
