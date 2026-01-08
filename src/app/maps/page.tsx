
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDispensaries } from '@/hooks/use-dispensaries';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Skeleton } from '@/components/ui/skeleton';
import type { Dispensary } from '@/lib/types';
import MapView from '@/components/maps/map-view';
import MapSidebar from '@/components/maps/map-sidebar';

export default function MapsPage() {
    const { dispensaries, isLoading, error } = useDispensaries();
    const [filteredDispensaries, setFilteredDispensaries] = useState<Dispensary[]>([]);
    const [selectedDispensary, setSelectedDispensary] = useState<Dispensary | null>(null);

    useEffect(() => {
        if (dispensaries) {
            setFilteredDispensaries(dispensaries);
        }
    }, [dispensaries]);

    const handleCityChange = (city: string) => {
        setSelectedDispensary(null);
        if (city === 'all') {
            setFilteredDispensaries(dispensaries);
        } else {
            setFilteredDispensaries(dispensaries.filter(d => d.city === city));
        }
    };
    
    const handleDispensarySelect = (dispensary: Dispensary | null) => {
        setSelectedDispensary(dispensary);
    }

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-dvh">
                <HeaderProvider />
                <main className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                    <div className="col-span-1 p-4 border-r">
                        <Skeleton className="h-10 w-full mb-4" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                         <Skeleton className="h-full w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen">
            <HeaderProvider />
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 overflow-hidden">
                <MapSidebar 
                    allDispensaries={dispensaries}
                    filteredDispensaries={filteredDispensaries}
                    selectedDispensary={selectedDispensary}
                    onCityChange={handleCityChange}
                    onDispensarySelect={handleDispensarySelect}
                />
                <MapView 
                    dispensaries={filteredDispensaries}
                    onMarkerClick={handleDispensarySelect}
                    selectedDispensary={selectedDispensary}
                />
            </main>
        </div>
    );
}
