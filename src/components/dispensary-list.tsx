import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Dispensary } from '@/lib/types';
import { ChevronDown, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea } from './ui/scroll-area';

interface DispensaryListProps {
  dispensaries: Dispensary[];
}

const getPlaceholderImage = (id: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/default/200/200', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

export default function DispensaryList({ dispensaries }: DispensaryListProps) {
  return (
    <div className="bg-white rounded-lg border h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <p className="text-sm text-gray-600">Showing results 1 - {dispensaries.length}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm">
              Sort by
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Recommended</DropdownMenuItem>
            <DropdownMenuItem>Distance</DropdownMenuItem>
            <DropdownMenuItem>Rating</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="flex-grow">
        <div className="divide-y">
          {dispensaries.map((dispensary) => {
            const { imageUrl, imageHint } = getPlaceholderImage(dispensary.imageId);
            return (
              <div key={dispensary.name} className="p-4">
                <div className="flex items-start gap-4">
                  <Image src={imageUrl} alt={dispensary.name} width={64} height={64} className="rounded-md object-cover border" data-ai-hint={imageHint} />
                  <div className="flex-grow">
                    <h3 className="font-bold">{dispensary.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{dispensary.rating} ({dispensary.reviews})</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{dispensary.type}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-gray-300">Open now</Button>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-gray-300">Order online</Button>
                    </div>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full mt-4 border-gray-300">
                  <Link href={`/dispensary/${dispensary.slug}`}>View menu</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
