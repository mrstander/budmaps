
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
    const defaultCenter = 'Cape Town, South Africa'; // Default to a known location string
    const defaultZoom = 10;

    // Use selected dispensary's address, or first dispensary's address, or default to Cape Town.
    // Google Maps API can handle address strings.
    const mapCenter = selectedDispensary?.address
        ? `${selectedDispensary.address}, ${selectedDispensary.city}, ${selectedDispensary.state}`
        : dispensaries.length > 0 && dispensaries[0].address
        ? `${dispensaries[0].address}, ${dispensaries[0].city}, ${dispensaries[0].state}`
        : defaultCenter;
        
    const mapSrc = googleMapsApiKey && googleMapsApiKey !== "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(mapCenter)}&zoom=${selectedDispensary ? 14 : defaultZoom}`
        : '';
        
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
                key={mapCenter} // Add key to force re-render on center change
                className="w-full h-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
            >
            </iframe>
            {/* The markers would be implemented here if using Google Maps JS API */}
            {/* For the iframe, the location is indicated by the built-in map marker. */}
        </div>
    );
}

export default memo(MapView);

