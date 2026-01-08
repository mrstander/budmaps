

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, Download, AlertCircle } from 'lucide-react';
import type { Product, ProductPrice, EdibleProductPrice, SodaProductPrice } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface ProductCsvImportProps {
  dispensaryId: string;
  onImportComplete: () => void;
}

const generateSlug = (name: string) => name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

export default function ProductCsvImport({ dispensaryId, onImportComplete }: ProductCsvImportProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState<'Flower' | 'Edible' | 'Soda' | 'Other'>('Flower');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!dispensaryId) {
      setError("Please select a dispensary before importing.");
      return;
    }
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const products: Partial<Product>[] = results.data as Partial<Product>[];
        if (!products.length) {
            setError("CSV file is empty or invalid.");
            setIsUploading(false);
            return;
        }

        const batch = writeBatch(firestore);
        const productsCollectionRef = collection(firestore, 'dispensaries', dispensaryId, 'products');

        products.forEach((productData, index) => {
          if (!productData.name) return;

          const productDocRef = doc(productsCollectionRef);
          
          let finalProductData: any = {
              ...productData,
              dispensaryId: dispensaryId,
              thc: parseFloat(productData.thc as any) || 0,
              cbd: parseFloat(productData.cbd as any) || 0,
              slug: generateSlug(productData.name),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
          };

          if (productType === 'Flower') {
              finalProductData.type = 'Flower';
              const pricing: ProductPrice[] = [];
              for (let i = 1; i <= 5; i++) { 
                  const weight = (productData as any)[`weight_${i}`];
                  const price = (productData as any)[`price_${i}`];
                  const stock = (productData as any)[`stock_${i}`];
                  if (weight && price && stock) {
                      pricing.push({
                          weight,
                          price: parseFloat(price),
                          stock: parseInt(stock, 10),
                      });
                  }
              }
              finalProductData.pricing = pricing;
              delete finalProductData.price;
              delete finalProductData.weight;
              delete finalProductData.stock;
          } else if (productType === 'Edible') {
              finalProductData.type = 'Edible';
              const ediblePricing: Partial<EdibleProductPrice>[] = [];
              for (let i = 1; i <= 5; i++) {
                  const strength = (productData as any)[`strength_${i}`];
                  const price = (productData as any)[`price_${i}`];
                  const salePrice = (productData as any)[`salePrice_${i}`];
                  const stock = (productData as any)[`stock_${i}`];
                  if (strength && price && stock) {
                      ediblePricing.push({
                          strength,
                          price: parseFloat(price),
                          salePrice: salePrice ? parseFloat(salePrice) : null,
                          stock: parseInt(stock, 10),
                      });
                  }
              }
              finalProductData.ediblePricing = ediblePricing;
              delete finalProductData.price;
              delete finalProductData.weight;
              delete finalProductData.stock;
          } else if (productType === 'Soda') {
              finalProductData.type = 'Soda';
              const sodaPricing: Partial<SodaProductPrice>[] = [];
              for (let i = 1; i <= 5; i++) {
                  const flavour = (productData as any)[`flavour_${i}`];
                  const price = (productData as any)[`price_${i}`];
                  const salePrice = (productData as any)[`salePrice_${i}`];
                  const stock = (productData as any)[`stock_${i}`];
                  if (flavour && price && stock) {
                      sodaPricing.push({
                          flavour,
                          price: parseFloat(price),
                          salePrice: salePrice ? parseFloat(salePrice) : null,
                          stock: parseInt(stock, 10),
                      });
                  }
              }
              finalProductData.sodaPricing = sodaPricing;
              delete finalProductData.price;
              delete finalProductData.weight;
              delete finalProductData.stock;
          } else {
              finalProductData.price = parseFloat(productData.price as any) || 0;
              finalProductData.stock = parseInt(productData.stock as any, 10) || 0;
              finalProductData.salePrice = productData.salePrice ? parseFloat(productData.salePrice as any) : null;
          }
          
          if (productData.additionalImageUrls && typeof productData.additionalImageUrls === 'string') {
            finalProductData.additionalImageUrls = productData.additionalImageUrls.split(',').map(url => url.trim()).filter(Boolean);
          } else {
            finalProductData.additionalImageUrls = [];
          }
           
          // Sanitize final object to replace undefined with null
          Object.keys(finalProductData).forEach(key => {
            if (finalProductData[key] === undefined) {
              finalProductData[key] = null;
            }
          });

          batch.set(productDocRef, finalProductData);
          
          setUploadProgress(((index + 1) / products.length) * 100);
        });

        try {
          await batch.commit();
          toast({
            title: "Import Successful",
            description: `${products.length} products have been imported to your inventory.`,
          });
          onImportComplete();
        } catch (err: any) {
          setError(err.message || "Failed to import products.");
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: err.message,
          });
        } finally {
          setIsUploading(false);
        }
      },
      error: (err: any) => {
        setError(err.message);
        setIsUploading(false);
      }
    });
  }, [firestore, dispensaryId, toast, onImportComplete, productType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: isUploading || !dispensaryId,
  });
  
  const getTemplateUrl = () => {
    switch(productType) {
        case 'Flower': return '/csv_templates/flower_template.csv';
        case 'Edible': return '/csv_templates/edible_template.csv';
        case 'Soda': return '/csv_templates/soda_template.csv';
        case 'Other': return '/csv_templates/vape_concentrate_preroll_template.csv';
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="p-4 border rounded-lg bg-background">
          <h3 className="font-semibold mb-2">Step 1: Select Product Type</h3>
          <p className="text-sm text-muted-foreground mb-4">Each product type has a different CSV structure, especially for pricing.</p>
           <Select value={productType} onValueChange={(value: any) => setProductType(value)}>
                <SelectTrigger className="w-full md:w-[240px]">
                    <SelectValue placeholder="Select product type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Flower">Flower (Tiered by weight)</SelectItem>
                    <SelectItem value="Edible">Edible (Tiered by strength)</SelectItem>
                    <SelectItem value="Soda">Soda (Tiered by flavour)</SelectItem>
                    <SelectItem value="Other">Vape, Concentrate, Pre-roll (Single price)</SelectItem>
                </SelectContent>
            </Select>
      </div>

      <div className="p-4 border rounded-lg bg-background">
        <h3 className="font-semibold mb-2">Step 2: Download & Fill Template</h3>
        <p className="text-sm text-muted-foreground mb-4">Download the CSV template for your selected product type, fill it with your product data, and save it.</p>
        <a href={getTemplateUrl()} download>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download {productType} Template
          </Button>
        </a>
      </div>

      <div className="p-4 border rounded-lg bg-background">
        <h3 className="font-semibold mb-2">Step 3: Upload CSV File</h3>
        <p className="text-sm text-muted-foreground mb-4">Drop your completed CSV file here or click to select it.</p>
         <div
            {...getRootProps()}
            className={cn(
            'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
            'border-input hover:border-primary/50',
            isDragActive && 'border-primary bg-primary/10',
            (isUploading || !dispensaryId) && 'cursor-not-allowed opacity-50'
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <UploadCloud className="w-10 h-10" />
                {isUploading ? (
                    <p>Uploading...</p>
                ) : isDragActive ? (
                    <p>Drop the file here ...</p>
                ) : dispensaryId ? (
                    <p>Drag & drop a CSV file here, or click to select</p>
                ) : (
                    <p>Please select a store before uploading.</p>
                )}
            </div>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Importing products...</p>
            <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );

    
}

  