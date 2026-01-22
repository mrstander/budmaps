import { collection, getDocs, getFirestore, query, collectionGroup, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Product, Dispensary } from '@/lib/types';
import ProductsClientPage from './client-page';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';

async function getData() {
    try {
        const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(firebaseApp);

        // 1. Fetch all products using collectionGroup
        console.log("Fetching all products via collectionGroup...");
        const productsQuery = query(collectionGroup(db, 'products'));
        const productsSnapshot = await getDocs(productsQuery);
        console.log(`Found ${productsSnapshot.size} products.`);

        if (productsSnapshot.empty) {
            return { products: [] };
        }

        // 2. Identify all unique dispensary IDs
        const dispensaryIds = new Set<string>();
        productsSnapshot.forEach(doc => {
            const dispensaryId = doc.ref.parent.parent?.id;
            if (dispensaryId) dispensaryIds.add(dispensaryId);
        });

        // 3. Fetch dispensary details for these IDs
        // We do this in chunks to avoid URL length issues or performant lookups
        const dispensaryMap = new Map<string, Dispensary>();
        const idArray = Array.from(dispensaryIds);

        console.log(`Fetching ${idArray.length} unique dispensaries...`);

        await Promise.all(idArray.map(async (id) => {
            try {
                const dDoc = await getDoc(doc(db, 'dispensaries', id));
                if (dDoc.exists()) {
                    const data = dDoc.data();
                    dispensaryMap.set(id, {
                        ...data,
                        id: dDoc.id,
                        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
                        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || null),
                    } as Dispensary);
                }
            } catch (err) {
                console.error(`Error fetching dispensary ${id}:`, err);
            }
        }));

        // 4. Map products to their dispensaries
        const productsWithDispensaries: (Product & { dispensary: Dispensary })[] = [];

        productsSnapshot.forEach(productDoc => {
            const productData = productDoc.data();
            const dispensaryId = productDoc.ref.parent.parent?.id;

            if (dispensaryId) {
                const dispensary = dispensaryMap.get(dispensaryId);
                if (dispensary) {
                    productsWithDispensaries.push({
                        ...productData,
                        id: productDoc.id,
                        dispensaryId: dispensaryId,
                        dispensary: dispensary,
                        createdAt: productData.createdAt instanceof Timestamp ? productData.createdAt.toDate().toISOString() : (productData.createdAt || null),
                        updatedAt: productData.updatedAt instanceof Timestamp ? productData.updatedAt.toDate().toISOString() : (productData.updatedAt || null),
                    } as Product & { dispensary: Dispensary });
                }
            }
        });

        console.log(`Successfully matched ${productsWithDispensaries.length} products with their dispensaries.`);
        return {
            products: productsWithDispensaries
        };
    } catch (error) {
        console.error("Detailed error in getData:", error);
        return {
            products: []
        };
    }
}

export default async function ProductsPage() {
    const { products } = await getData();

    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            <ProductsClientPage initialProducts={products} />
            <Footer />
        </div>
    );
}
