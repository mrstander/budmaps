
'use client';

import { memo } from 'react';
import type { Dispensary } from '@/lib/types';
import { Compass, MapPin } from 'lucide-react';

interface MapViewProps {
    dispensaries: Dispensary[];
    onMarkerClick: (dispensary: Dispensary) => void;
    selectedDispensary: Dispensary | null;
}

const MapView = ({ dispensaries, onMarkerClick, selectedDispensary }: MapViewProps) => {
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const defaultCenter = { lat: -33.918861, lng: 18.423300 }; // Default to Cape Town
    const defaultZoom = 10;

    // Use selected dispensary's location or first dispensary's location or default
    const mapCenter = selectedDispensary?.coordinates 
        ? `${selectedDispensary.coordinates.top},${selectedDispensary.coordinates.left}`
        : dispensaries.length > 0 && dispensaries[0].address
        ? dispensaries[0].address
        : `${defaultCenter.lat},${defaultCenter.lng}`;
        
    const mapSrc = googleMapsApiKey && googleMapsApiKey !== "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        ? `https://www.google.com/maps/embed/v1/view?key=${googleMapsApiKey}&center=${mapCenter}&zoom=${selectedDispensary ? 14 : defaultZoom}`
        : '';
        
    // This is a simple placeholder for markers since we are using an iframe
    // A real implementation would use the Google Maps JS API for custom markers
    const markers = dispensaries.map(dispensary => {
        if (!dispensary.coordinates) return null;
        const isSelected = selectedDispensary?.id === dispensary.id;
        return (
            <button
                key={dispensary.id}
                onClick={() => onMarkerClick(dispensary)}
                className="absolute transform -translate-x-1/2 -translate-y-full"
                style={{ top: dispensary.coordinates.top, left: dispensary.coordinates.left }}
                aria-label={`Show ${dispensary.name}`}
            >
                <MapPin className={`w-8 h-8 drop-shadow-lg transition-all ${isSelected ? 'text-blue-600 scale-125' : 'text-primary'}`} />
            </button>
        )
    })

    if (!googleMapsApiKey || googleMapsApiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
        return (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-muted h-full flex flex-col items-center justify-center text-center p-4">
                 <Compass className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg">Map Unavailable</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    This interactive map feature requires a Google Maps API key. Please add your key to the 
                    <code className="bg-background border rounded-sm px-1 py-0.5 text-xs mx-1">.env</code> 
                    file to enable it.
                </p>
            </div>
        )
    }

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 h-full relative">
            <iframe
                className="w-full h-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
            >
            </iframe>
            {/* The markers are just for show in this iframe version */}
            {/* <div className="absolute inset-0 pointer-events-none">{markers}</div> */}
        </div>
    );
}

export default memo(MapView);
