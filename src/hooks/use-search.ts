'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    limit,
    collectionGroup,
    orderBy,
    startAt,
    endAt
} from 'firebase/firestore';
import type { Dispensary, Product } from '@/lib/types';

interface SearchResults {
    dispensaries: Dispensary[];
    products: Product[];
    isLoading: boolean;
    error: Error | null;
}

export function useSearch(searchTerm: string): SearchResults {
    const firestore = useFirestore();
    const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const performSearch = useCallback(async (term: string) => {
        if (!term || term.length < 2) {
            setDispensaries([]);
            setProducts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Normalize term for basic prefix search
            const normalizedTerm = term.toLowerCase();
            const searchEnd = normalizedTerm + '\uf8ff';

            // 1. Search Dispensaries
            const dispensariesRef = collection(firestore, 'dispensaries');
            const dQuery = query(
                dispensariesRef,
                orderBy('name'),
                startAt(term),
                endAt(term + '\uf8ff'),
                limit(5)
            );

            const dSnapshot = await getDocs(dQuery);
            const dResults = dSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Dispensary));

            // 2. Search Products (Collection Group)
            const productsRef = collectionGroup(firestore, 'products');
            const pQuery = query(
                productsRef,
                orderBy('name'),
                startAt(term),
                endAt(term + '\uf8ff'),
                limit(5)
            );

            const pSnapshot = await getDocs(pQuery);
            const pResults = pSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Product));

            setDispensaries(dResults);
            setProducts(pResults);
        } catch (err: any) {
            console.error("Search error:", err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    return { dispensaries, products, isLoading, error };
}
