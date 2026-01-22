

import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Flame, Cookie, Droplets, Cigarette, Sparkles, MapPin, Tag, Hourglass, Wheat, Package, Heart, GlassWater, SprayCan } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Category, Dispensary, Region, Product } from '@/lib/types';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { collection, getDocs, getFirestore, query, where, collectionGroup, doc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import DealProductCard from '@/components/deal-product-card';
import { Badge } from '@/components/ui/badge';

type ProductWithDispensary = Product & { dispensary: Dispensary };

const allCategories: Category[] = [
  { id: 'flower', name: 'Flower', imageId: 'category-flower', icon: Leaf },
  { id: 'vapes', name: 'Vapes', imageId: 'category-vape', icon: Flame },
  { id: 'edibles', name: 'Edibles', imageId: 'category-edible', icon: Cookie },
  { id: 'concentrates', name: 'Concentrates', imageId: 'category-concentrate', icon: Droplets },
  { id: 'prerolls', name: 'Pre-rolls', imageId: 'category-preroll', icon: Cigarette },
  { id: 'cbd', name: 'CBD', imageId: 'category-cbd', icon: Sparkles },
];

const homePageCategories = [
  { name: 'Limited Collection', icon: Hourglass, href: '/category/concentrates' },
  { name: 'New Strains', icon: Wheat, href: '/category/flower', badge: 'NEW' },
  { name: 'Buds', icon: Leaf, href: '/category/flower', badge: 'Popular' },
  { name: 'Extracts & Vapes', icon: SprayCan, href: '/category/vapes' },
  { name: 'Edibles', icon: Cookie, href: '/category/edibles', badge: 'Returned' },
  { name: 'Accessories', icon: GlassWater, href: '/category/concentrates' },
  { name: 'Joints', icon: Cigarette, href: '/category/prerolls' },
]

const categoryIdToProductType: { [key: string]: Product['category'] } = {
  'flower': 'Flower',
  'vapes': 'Vape',
  'edibles': 'Edible',
  'concentrates': 'Concentrate',
  'prerolls': 'Pre-roll',
  'soda': 'Soda'
};

const getPlaceholderImage = (id: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/default/600/400', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

async function getDispensaries(featuredOnly: boolean = false): Promise<Dispensary[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const dispensariesCol = collection(db, 'dispensaries');
    const q = featuredOnly ? query(dispensariesCol, where('isFeatured', '==', true)) : query(dispensariesCol);
    const dispensarySnapshot = await getDocs(q);
    return dispensarySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Dispensary));
  } catch (error) {
    console.error("Error fetching dispensaries:", error);
    return [];
  }
}

async function getHotDeals(): Promise<ProductWithDispensary[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);

    // 1. Fetch all dispensaries and create a map
    const dispensariesSnapshot = await getDocs(collection(db, 'dispensaries'));
    const dispensaryMap = new Map<string, Dispensary>();
    dispensariesSnapshot.forEach(doc => {
      dispensaryMap.set(doc.id, { id: doc.id, ...doc.data() } as Dispensary);
    });

    // 2. Fetch all "hot deal" products
    const productsQuery = query(collectionGroup(db, 'products'), where('isHotDeal', '==', true));
    const productsSnapshot = await getDocs(productsQuery);

    const hotDeals: ProductWithDispensary[] = [];
    productsSnapshot.forEach(productDoc => {
      const productData = productDoc.data() as Product;
      const dispensaryId = productDoc.ref.parent.parent?.id;

      if (dispensaryId) {
        const dispensary = dispensaryMap.get(dispensaryId);
        if (dispensary) {
          hotDeals.push({
            ...productData,
            id: productDoc.id,
            dispensaryId: dispensaryId,
            dispensary: dispensary
          });
        }
      }
    });

    return hotDeals;
  } catch (error) {
    console.error("Error fetching hot deals:", error);
    return [];
  }
}


async function getAvailableCategories(): Promise<Category[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const productsQuery = query(collectionGroup(db, 'products'));
    const productsSnapshot = await getDocs(productsQuery);

    const availableProductTypes = new Set<string>();
    let hasCbdProduct = false;

    productsSnapshot.forEach(doc => {
      const product = doc.data() as Product;
      if (product.category) {
        availableProductTypes.add(product.category);
      }
      if (product.cbd && product.cbd > 0) {
        hasCbdProduct = true;
      }
    });

    const availableCategories = allCategories.filter(category => {
      if (category.id === 'cbd') {
        return hasCbdProduct;
      }
      const productType = categoryIdToProductType[category.id];
      return productType ? availableProductTypes.has(productType) : false;
    });

    return availableCategories;

  } catch (error) {
    console.error("Error fetching products for category availability:", error);
    // Fallback to all categories on error
    return allCategories;
  }
}

function generateRegionsFromDispensaries(dispensaries: Dispensary[]): Region[] {
  const regionsMap: { [state: string]: { slug: string; cities: Set<string> } } = {};

  dispensaries.forEach(dispensary => {
    if (dispensary.state && dispensary.city) {
      if (!regionsMap[dispensary.state]) {
        regionsMap[dispensary.state] = {
          slug: dispensary.state.toLowerCase().replace(/\s+/g, '-'),
          cities: new Set(),
        };
      }
      regionsMap[dispensary.state].cities.add(dispensary.city);
    }
  });

  return Object.entries(regionsMap).map(([state, { slug, cities }]) => ({
    state,
    slug,
    cities: Array.from(cities).sort(),
  }));
}


export default async function Home() {
  const featuredDispensaries = await getDispensaries(true);
  const allDispensaries = await getDispensaries(false);
  const hotDeals = await getHotDeals();
  const dispensaryRegions = generateRegionsFromDispensaries(allDispensaries);
  const availableCategories = await getAvailableCategories();

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow">


        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Carousel */}
              <div className="lg:col-span-2">
                <Link href="/deals" className="block relative rounded-xl overflow-hidden h-[500px] group">
                  <Image src="https://plus.unsplash.com/premium_photo-1695229820933-fa53194ed81f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Promotion" fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="cannabis product" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-8 text-white">
                    <h2 className="text-3xl font-bold">Hot Deals</h2>
                    <p>Check out the latest sales.</p>
                  </div>
                </Link>
              </div>

              {/* Side Banners */}
              <div className="flex flex-col gap-6">
                <Link href="#" className="block relative rounded-xl overflow-hidden h-full group">
                  <Image src="https://images.unsplash.com/photo-1621335891390-3b03d7e5e8e3?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Fast Delivery" fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="delivery scooter" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h3 className="text-2xl font-bold">Fast Delivery</h3>
                    <p className="text-sm">Get your order in minutes</p>
                  </div>
                </Link>
                <Link href="/deals" className="block relative rounded-xl overflow-hidden h-full group">
                  <Image src="https://images.unsplash.com/photo-1556928045-16f7f50be0f3?q=80&w=1974&auto=format&fit=crop" alt="Promotion" fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="cannabis lifestyle" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h2 className="text-2xl font-bold">New Arrivals</h2>
                    <p>Explore the freshest products.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-center font-headline">Featured Dispensaries</h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {featuredDispensaries.map((dispensary) => {
                const imageUrl = dispensary.imageUrl || getPlaceholderImage('dispensary-1').imageUrl;
                const imageHint = dispensary.imageUrl ? 'dispensary' : getPlaceholderImage('dispensary-1').imageHint;
                return (
                  <Link key={dispensary.id} href={`/dispensary/${dispensary.slug}`}>
                    <Card className="overflow-hidden group transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 h-full">
                      <div className="aspect-video relative overflow-hidden">
                        <Image src={imageUrl} alt={dispensary.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
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
          </div>
        </section>

        {hotDeals.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-center font-headline mb-10">Today's Hot Deals</h2>
              <Carousel
                opts={{
                  align: "start",
                  loop: hotDeals.length > 4,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {hotDeals.map((product) => (
                    <CarouselItem key={product.id} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <div className="p-2 h-full">
                        <DealProductCard product={product} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
