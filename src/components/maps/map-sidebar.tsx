
'use client';

import { useMemo } from 'react';
import type { Dispensary } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MapPin, Star, Phone, Globe, X } from 'lucide-react';
import { isDispensaryOpen } from '@/lib/is-dispensary-open';

interface MapSidebarProps {
    allDispensaries: Dispensary[];
    filteredDispensaries: Dispensary[];
    selectedDispensary: Dispensary | null;
    onCityChange: (city: string) => void;
    onDispensarySelect: (dispensary: Dispensary | null) => void;
}

const getPlaceholderImage = (id?: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  return image || { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
};

const SidebarDispensaryDetail = ({ dispensary, onClear }: { dispensary: Dispensary, onClear: () => void }) => {
    const { imageUrl, imageHint } = getPlaceholderImage(dispensary.imageId || 'dispensary-1');
    const displayImageUrl = dispensary.imageUrl || imageUrl;
    const isOpen = isDispensaryOpen(dispensary);
    
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-start">
                 <h2 className="text-2xl font-bold mb-2">{dispensary.name}</h2>
                 <Button variant="ghost" size="icon" onClick={onClear}>
                    <X className="w-5 h-5"/>
                 </Button>
            </div>
            <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                <Image src={displayImageUrl} alt={dispensary.name} fill className="object-cover" data-ai-hint={imageHint} />
            </div>
            <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-primary" /> {dispensary.address}, {dispensary.suburb}, {dispensary.city}</p>
                <p className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary" /> {dispensary.phone}</p>
                <p className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-primary" /> <a href={dispensary.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{dispensary.website}</a></p>
                <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{dispensary.rating || 4.5} ({dispensary.reviews || 0} reviews)</span>
                </div>
                 <div className={`flex items-center gap-2 font-semibold text-sm ${isOpen ? 'text-green-600' : 'text-destructive'}`}>
                    <span>{isOpen ? 'Open Now' : 'Currently Closed'}</span>
                </div>
            </div>
            <Button asChild className="w-full">
                <Link href={`/dispensary/${dispensary.slug}`}>View Menu & Details</Link>
            </Button>
        </div>
    );
}

export default function MapSidebar({
    allDispensaries,
    filteredDispensaries,
    selectedDispensary,
    onCityChange,
    onDispensarySelect
}: MapSidebarProps) {
    
    const availableCities = useMemo(() => {
        const cities = new Set(allDispensaries.map(d => d.city).filter(Boolean));
        return ['all', ...Array.from(cities)] as string[];
    }, [allDispensaries]);

    return (
        <aside className="col-span-1 flex flex-col border-r h-full overflow-y-auto">
            <div className="p-4 border-b">
                 <label htmlFor="city-filter" className="text-sm font-medium">Filter by City</label>
                 <Select onValueChange={onCityChange} defaultValue="all">
                    <SelectTrigger id="city-filter" className="w-full mt-1">
                        <SelectValue placeholder="Select a city" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableCities.map(city => (
                            <SelectItem key={city} value={city}>{city === 'all' ? 'All Cities' : city}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <ScrollArea className="flex-grow">
                {selectedDispensary ? (
                    <SidebarDispensaryDetail dispensary={selectedDispensary} onClear={() => onDispensarySelect(null)} />
                ) : (
                    <div className="divide-y">
                        {filteredDispensaries.length > 0 ? filteredDispensaries.map(dispensary => (
                            <button 
                                key={dispensary.id} 
                                className="w-full text-left p-4 hover:bg-muted"
                                onClick={() => onDispensarySelect(dispensary)}
                            >
                                <h3 className="font-semibold">{dispensary.name}</h3>
                                <p className="text-sm text-muted-foreground">{dispensary.suburb ? `${dispensary.suburb}, ` : ''}{dispensary.city}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span>{dispensary.rating || 4.5}</span>
                                    <span>• {dispensary.type || 'Dispensary'}</span>
                                </div>
                            </button>
                        )) : (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>No dispensaries found for this area.</p>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </aside>
    );
}
