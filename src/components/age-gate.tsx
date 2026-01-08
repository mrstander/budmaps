'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgeGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTooYoung, setIsTooYoung] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const ageVerified = localStorage.getItem('age_verified');
    if (ageVerified !== 'true') {
      setIsOpen(true);
    }
  }, []);

  const handleYes = () => {
    localStorage.setItem('age_verified', 'true');
    setIsOpen(false);
  };

  const handleNo = () => {
    setIsTooYoung(true);
  };

  // Prevent hydration mismatch by only rendering when mounted on client
  if (!isMounted) {
    return null;
  }

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        className={cn(
          "flex flex-col items-center justify-center text-center p-8",
          isTooYoung && "pointer-events-none"
        )}
      >
        <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-10 w-10 text-primary" />
            <span className="font-bold text-3xl">budmaps</span>
        </div>
        <AlertDialogHeader className="mb-6">
          <AlertDialogTitle className="text-2xl font-bold">
            Are you 21 or older?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {isTooYoung
              ? 'Sorry, you must be 21 or older to access this site.'
              : 'You must be at least 21 years old to enter.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isTooYoung && (
          <AlertDialogFooter className="flex sm:flex-row gap-4 w-full">
            <Button variant="outline" onClick={handleNo} className="w-full">
              I am Under 21
            </Button>
            <Button onClick={handleYes} className="w-full">
              I am 21 or Older
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
