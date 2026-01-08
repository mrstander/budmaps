

import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import type { Dispensary, Category, Product } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { collection, getDocs, getFirestore, query, where, DocumentData, collectionGroup, doc, getDoc } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Leaf, Flame, Cookie, Droplets, Cigarette, Sparkles, Package } from 'lucide-react';
import DealProductCard from '@/components/deal-product-card';

type ProductWithDispensary = Product & { dispensary: Dispensary };

const categories: Category[] = [
    { id: 'flower', name: 'Flower', imageId: 'category-flower', icon: Leaf },
    { id: 'vapes', name: 'Vapes', imageId: 'category-vape', icon: Flame },
    { id: 'edibles', name: 'Edibles', imageId: 'category-edible', icon: Cookie },
    { id: 'concentrates', name: 'Concentrates', imageId: 'category-concentrate', icon: Droplets },
    { id: 'prerolls', name: 'Pre-rolls', imageId: 'category-preroll', icon: Cigarette },
    { id: 'soda', name: 'Soda', imageId: 'category-soda', icon: Sparkles },
    { id: 'cbd', name: 'CBD', imageId: 'category-cbd', icon: Sparkles },
];

const categorySlugToProductCategory = (slug: string): Product['category'] | null => {
  const mapping: { [key: string]: Product['category'] } = {
    'flower': 'Flower',
    'vapes': 'Vape',
    'edibles': 'Edible',
    'concentrates': 'Concentrate',
    'prerolls': 'Pre-roll',
    'soda': 'Soda',
  };
  if (slug === 'cbd') return null; // CBD is a special case handled by a different query property
  return mapping[slug] || null;
}

async function getProductsByCategory(categorySlug: string): Promise<ProductWithDispensary[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);

    const productCategory = categorySlugToProductCategory(categorySlug);
    
    let productsQuery;
    if (categorySlug === 'cbd') {
      // Special case for CBD: query for products where cbd > 0
      productsQuery = query(collectionGroup(db, 'products'), where("cbd", ">", 0));
    } else if (productCategory) {
      // Query for a specific product category
      productsQuery = query(collectionGroup(db, 'products'), where("category", "==", productCategory));
    } else {
      // If the category slug is not recognized, return no products
      return [];
    }

    const productsSnapshot = await getDocs(productsQuery);
    if (productsSnapshot.empty) {
      return [];
    }
    
    const dispensaryCache = new Map<string, Dispensary>();

    const productsWithDispensaries: ProductWithDispensary[] = [];
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data() as Product;
      const dispensaryId = productDoc.ref.parent.parent?.id;
      
      if (dispensaryId) {
        let dispensaryData = dispensaryCache.get(dispensaryId);
        
        if (!dispensaryData) {
            const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
            const dispensarySnap = await getDoc(dispensaryRef);
            if (dispensarySnap.exists()) {
                dispensaryData = { id: dispensarySnap.id, ...dispensarySnap.data() } as Dispensary;
                dispensaryCache.set(dispensaryId, dispensaryData);
            }
        }
        
        if (dispensaryData) {
          productsWithDispensaries.push({ 
            ...productData, 
            id: productDoc.id, 
            dispensaryId: dispensaryId,
            dispensary: dispensaryData 
          });
        }
      }
    }
    
    return productsWithDispensaries;

  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = categories.find(c => c.id === params.slug);
  
  if (!category) {
    notFound();
  }
  
  const products = await getProductsByCategory(params.slug);

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
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mt-4">
            All {category.name} Products
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Browse all {category.name.toLowerCase()} products available from dispensaries near you.
          </p>
        </div>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {products.map((product) => (
               <DealProductCard key={`${product.dispensaryId}-${product.id}`} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">No Products Found</h2>
            <p className="text-muted-foreground mt-2">There are currently no products listed in the {category.name} category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
