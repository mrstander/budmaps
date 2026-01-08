
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WeedMarker from '@/components/weed-marker';
import type { Dispensary } from '@/lib/types';
import { Plus, Minus } from 'lucide-react';
import Link from 'next/link';

interface DispensaryMapProps {
  dispensaries: Dispensary[];
  regionName: string;
}

export default function DispensaryMap({ dispensaries, regionName }: DispensaryMapProps) {
  const [selectedDispensary, setSelectedDispensary] = useState<Dispensary | null>(null);

  const handleMarkerClick = (dispensary: Dispensary) => {
    setSelectedDispensary(dispensary);
  };

  const handleCloseModal = () => {
    setSelectedDispensary(null);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border shadow-lg">
      <Image
        src="https://images.unsplash.com/photo-1579546929518-9e396f3a8034?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2370&q=80"
        alt={`Map of ${regionName}`}
        fill
        className="object-cover opacity-50"
        data-ai-hint="map background"
      />
      <div className="absolute inset-0">
        {dispensaries.map((dispensary) => {
          // Only render the marker if coordinates exist to prevent runtime errors.
          if (!dispensary.coordinates) {
            return null;
          }
          return (
            <button
              key={dispensary.name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              style={{ top: dispensary.coordinates.top, left: dispensary.coordinates.left }}
              onClick={() => handleMarkerClick(dispensary)}
              aria-label={`View details for ${dispensary.name}`}
            >
              <WeedMarker className="w-10 h-10 text-orange-500 drop-shadow-lg transition-transform hover:scale-110" />
            </button>
          );
        })}
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col space-y-1">
        <Button size="icon" className="w-8 h-8 bg-white text-gray-800 hover:bg-gray-100 shadow">
          <Plus className="w-4 h-4" />
        </Button>
        <Button size="icon" className="w-8 h-8 bg-white text-gray-800 hover:bg-gray-100 shadow">
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <Button className="bg-white text-gray-800 hover:bg-gray-100 shadow">Redo search in this area</Button>
      </div>


      <Dialog open={!!selectedDispensary} onOpenChange={handleCloseModal}>
        <DialogContent>
          {selectedDispensary && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedDispensary.name}</DialogTitle>
                <DialogDescription>{selectedDispensary.location}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex justify-end gap-2">
                 <Button variant="outline" onClick={handleCloseModal}>Close</Button>
                <Button asChild>
                  <Link href={`/dispensary/${selectedDispensary.slug}`}>View Menu</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
