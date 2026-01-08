
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Dispensary } from '@/lib/types';

interface UseDispensariesResult {
    dispensaries: Dispensary[];
    isLoading: boolean;
    error: Error | null;
}

export function useDispensaries(): UseDispensariesResult {
    const firestore = useFirestore();
    const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const fetchDispensaries = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const dispensariesRef = collection(firestore, 'dispensaries');
                const q = query(dispensariesRef, orderBy('name'));
                const querySnapshot = await getDocs(q);
                const fetchedDispensaries = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Dispensary));
                setDispensaries(fetchedDispensaries);
            } catch (err: any) {
                console.error("Error fetching dispensaries:", err);
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDispensaries();
    }, [firestore]);

    return { dispensaries, isLoading, error };
}
