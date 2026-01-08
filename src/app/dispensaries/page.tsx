
'use client';

import { useState, useEffect, useMemo } from 'react';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import type { Dispensary } from '@/lib/types';
import { collection, getDocs, getFirestore, query, orderBy } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MapPin, Search } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DispensariesPage() {
  const [allDispensaries, setAllDispensaries] = useState<Dispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedSuburb, setSelectedSuburb] = useState('all');

  useEffect(() => {
    async function fetchAllDispensaries() {
      setIsLoading(true);
      try {
        const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(firebaseApp);
        const dispensariesCol = collection(db, 'dispensaries');
        const q = query(dispensariesCol, orderBy('name'));
        const dispensarySnapshot = await getDocs(q);
        const dispensaryList = dispensarySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Dispensary));
        setAllDispensaries(dispensaryList);
      } catch (error) {
        console.error("Error fetching all dispensaries:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllDispensaries();
  }, []);

  const availableStates = useMemo(() => {
    if (isLoading) return [];
    const states = new Set(allDispensaries.map(d => d.state).filter(Boolean));
    return ['all', ...Array.from(states)] as string[];
  }, [allDispensaries, isLoading]);

  const availableCities = useMemo(() => {
    if (isLoading || selectedState === 'all') return [];
    const cities = new Set(
      allDispensaries
        .filter(d => d.state === selectedState && d.city)
        .map(d => d.city!)
    );
    return ['all', ...Array.from(cities)];
  }, [allDispensaries, selectedState, isLoading]);
  
  const availableSuburbs = useMemo(() => {
    if (isLoading || selectedCity === 'all') return [];
    const suburbs = new Set(
        allDispensaries
            .filter(d => d.city === selectedCity && d.suburb)
            .map(d => d.suburb!)
    );
    return ['all', ...Array.from(suburbs)];
  }, [allDispensaries, selectedCity, isLoading]);

  useEffect(() => {
    setSelectedCity('all');
    setSelectedSuburb('all');
  }, [selectedState]);
  
  useEffect(() => {
    setSelectedSuburb('all');
  }, [selectedCity]);


  const filteredDispensaries = useMemo(() => {
    return allDispensaries.filter(dispensary => {
      const nameMatch = dispensary.name.toLowerCase().includes(searchTerm.toLowerCase());
      const stateMatch = selectedState === 'all' || dispensary.state === selectedState;
      const cityMatch = selectedCity === 'all' || dispensary.city === selectedCity;
      const suburbMatch = selectedSuburb === 'all' || dispensary.suburb === selectedSuburb;
      return nameMatch && stateMatch && cityMatch && suburbMatch;
    });
  }, [allDispensaries, searchTerm, selectedState, selectedCity, selectedSuburb]);

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
              <BreadcrumbItem>
                <BreadcrumbPage>Dispensaries</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mt-4">
            All Dispensaries
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Browse all dispensaries available on budmaps.
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
            <Select value={selectedState} onValueChange={setSelectedState} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by state..." />
              </SelectTrigger>
              <SelectContent>
                {availableStates.map(state => <SelectItem key={state} value={state}>{state === 'all' ? 'All States' : state}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === 'all' || availableCities.length <= 1}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by city..." />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map(city => <SelectItem key={city} value={city}>{city === 'all' ? 'All Cities' : city}</SelectItem>)}
              </SelectContent>
            </Select>
             <Select value={selectedSuburb} onValueChange={setSelectedSuburb} disabled={selectedCity === 'all' || availableSuburbs.length <= 1}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by suburb..." />
                </SelectTrigger>
                <SelectContent>
                    {availableSuburbs.map(suburb => <SelectItem key={suburb} value={suburb}>{suburb === 'all' ? 'All Suburbs' : suburb}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
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
        ) : filteredDispensaries.length > 0 ? (
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
            <p className="text-muted-foreground mt-2">No dispensaries match your current filters. Try widening your search!</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
