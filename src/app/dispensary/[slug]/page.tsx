

import { notFound } from 'next/navigation';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Dispensary, Product } from '@/lib/types';
import DispensaryDetailClient from './client-page';
import { collection, doc, getDoc, getDocs, getFirestore, query, where, Timestamp } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

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
    const dispensaryData = dispensaryDoc.data();

    const dispensary = {
      ...dispensaryData,
      id: dispensaryDoc.id,
      createdAt: dispensaryData.createdAt instanceof Timestamp ? dispensaryData.createdAt.toDate().toISOString() : (dispensaryData.createdAt || null),
      updatedAt: dispensaryData.updatedAt instanceof Timestamp ? dispensaryData.updatedAt.toDate().toISOString() : (dispensaryData.updatedAt || null),
    } as Dispensary;

    return dispensary;
  } catch (error) {
    console.error("Error fetching dispensary by slug:", error);
    return null;
  }
}

async function getProductsForDispensary(dispensaryId: string): Promise<Product[]> {
  try {
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(firebaseApp);
    const productsCol = collection(db, 'dispensaries', dispensaryId, 'products');
    const productsSnapshot = await getDocs(productsCol);

    if (productsSnapshot.empty) {
      return [];
    }

    const productList = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null),
      } as Product;
    });

    return productList;
  } catch (error) {
    console.error("Error fetching products for dispensary:", error);
    return [];
  }
}

export default async function DispensaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dispensary = await getDispensaryBySlug(slug);

  if (!dispensary || !dispensary.id) {
    notFound();
  }

  const products = await getProductsForDispensary(dispensary.id);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <DispensaryDetailClient dispensary={dispensary} products={products} />
      <Footer />
    </div>
  );
}
