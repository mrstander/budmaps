

import { notFound } from 'next/navigation';
import { collection, doc, getDoc, getFirestore, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Dispensary, Product } from '@/lib/types';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import ProductDetailClient from './client-page';

async function getDispensaryBySlug(slug: string): Promise<Dispensary | null> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const dispensariesCol = collection(db, 'dispensaries');
    const q = query(dispensariesCol, where("slug", "==", slug));
    const dispensarySnapshot = await getDocs(q);

    if (dispensarySnapshot.empty) {
      return null;
    }

    const dispensaryDoc = dispensarySnapshot.docs[0];
    const data = dispensaryDoc.data();
    return {
      ...data,
      id: dispensaryDoc.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null),
    } as Dispensary;
  } catch (error) {
    console.error("Error fetching dispensary by slug:", error);
    return null;
  }
}

const processProductDoc = (doc: any): Product => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null),
  } as Product;
};

async function getProductBySlug(dispensaryId: string, productSlug: string): Promise<Product | null> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const productsCol = collection(db, 'dispensaries', dispensaryId, 'products');
    const q = query(productsCol, where("slug", "==", productSlug));
    const productSnapshot = await getDocs(q);

    if (productSnapshot.empty) {
      return null;
    }

    const productDoc = productSnapshot.docs[0];
    return processProductDoc(productDoc);
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

async function getRelatedProducts(dispensaryId: string, currentProductId: string): Promise<Product[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const productsCol = collection(db, 'dispensaries', dispensaryId, 'products');
    const q = query(productsCol, limit(5)); // Get some products
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(processProductDoc)
      .filter(product => product.id !== currentProductId) // Exclude the current product
      .slice(0, 4); // Ensure we only return up to 4
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}


export default async function ProductPage({ params }: { params: Promise<{ slug: string, productSlug: string }> }) {
  const { slug, productSlug } = await params;
  const dispensary = await getDispensaryBySlug(slug);

  if (!dispensary || !dispensary.id) {
    notFound();
  }

  const product = await getProductBySlug(dispensary.id, productSlug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(dispensary.id, product.id);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <ProductDetailClient product={product} dispensary={dispensary} relatedProducts={relatedProducts} />
      <Footer />
    </div>
  );
}
