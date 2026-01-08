'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const productTypes: Product['type'][] = ['Flower', 'Vape', 'Edible', 'Concentrate', 'Pre-roll', 'Soda'];
const strainTypes: Product['strain'][] = ['Sativa', 'Indica', 'Hybrid'];

interface ProductFiltersProps {
  products: Product[];
  onFilterChange: (filteredProducts: Product[]) => void;
  initialCategoryFilter?: Set<string>;
  initialCbdFilter?: boolean;
}

const getProductStock = (product: Product): number => {
    if (product.type === 'Flower' && product.pricing) {
        return product.pricing.reduce((sum, tier) => sum + (tier.stock || 0), 0);
    }
    if (product.type === 'Edible' && product.ediblePricing) {
        return product.ediblePricing.reduce((sum, tier) => sum + (tier.stock || 0), 0);
    }
    if (product.type === 'Soda' && product.sodaPricing) {
        return product.sodaPricing.reduce((sum, tier) => sum + (tier.stock || 0), 0);
    }
    return product.stock || 0;
};

export default function ProductFilters({ 
  products, 
  onFilterChange, 
  initialCategoryFilter = new Set(),
  initialCbdFilter = false
}: ProductFiltersProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(initialCategoryFilter);
  const [selectedStrains, setSelectedStrains] = useState<Set<string>>(new Set());
  const [showCbdOnly, setShowCbdOnly] = useState<boolean>(initialCbdFilter);

  useEffect(() => {
    const noFiltersApplied = selectedTypes.size === 0 && selectedStrains.size === 0 && !showCbdOnly;

    const filtered = products.filter(product => {
      const typeMatch = selectedTypes.size === 0 || selectedTypes.has(product.type);
      const strainMatch = selectedStrains.size === 0 || (product.strain && selectedStrains.has(product.strain));
      const cbdMatch = !showCbdOnly || (product.cbd && product.cbd > 0);
      
      const stockMatch = noFiltersApplied ? getProductStock(product) > 0 : true;

      return typeMatch && strainMatch && cbdMatch && stockMatch;
    });
    onFilterChange(filtered);
  }, [selectedTypes, selectedStrains, showCbdOnly, products, onFilterChange]);
  
  // Reset local state if initial props change
  useEffect(() => {
    setSelectedTypes(initialCategoryFilter);
  }, [initialCategoryFilter]);

  useEffect(() => {
    setShowCbdOnly(initialCbdFilter);
  }, [initialCbdFilter]);

  const handleTypeChange = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleStrainChange = (strain: string) => {
    setSelectedStrains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strain)) {
        newSet.delete(strain);
      } else {
        newSet.add(strain);
      }
      return newSet;
    });
  };

  const categoryCounts = useMemo(() => {
    return productTypes.reduce((acc, type) => {
      acc[type] = products.filter(p => p.type === type && getProductStock(p) > 0).length;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  const strainCounts = useMemo(() => {
    return strainTypes.reduce((acc, strain) => {
      acc[strain] = products.filter(p => p.strain === strain).length;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);
  
  const cbdCount = useMemo(() => {
      return products.filter(p => p.cbd && p.cbd > 0).length;
  }, [products]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter & Sort</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['type', 'strain', 'other']} className="w-full">
          <AccordionItem value="type">
            <AccordionTrigger className="text-base font-semibold">Category</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 pt-2">
                {productTypes.map(type => (
                  categoryCounts[type] > 0 && (
                    <div key={type} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                          <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.has(type)}
                          onCheckedChange={() => handleTypeChange(type)}
                          />
                          <Label htmlFor={`type-${type}`} className="font-normal text-sm cursor-pointer">{type}</Label>
                      </div>
                      <span className="text-sm text-muted-foreground">{categoryCounts[type]}</span>
                    </div>
                  )
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="strain">
            <AccordionTrigger className="text-base font-semibold">Strain</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 pt-2">
                {strainTypes.map(strain => (
                  strainCounts[strain] > 0 && (
                  <div key={strain} className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                        id={`strain-${strain}`}
                        checked={selectedStrains.has(strain)}
                        onCheckedChange={() => handleStrainChange(strain)}
                        />
                        <Label htmlFor={`strain-${strain}`} className="font-normal text-sm cursor-pointer">{strain}</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{strainCounts[strain]}</span>
                  </div>
                  )
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="other">
            <AccordionTrigger className="text-base font-semibold">Other</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 pt-2">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                        id="showCbdOnly"
                        checked={showCbdOnly}
                        onCheckedChange={(checked) => setShowCbdOnly(!!checked)}
                        disabled={cbdCount === 0}
                        />
                        <Label htmlFor="showCbdOnly" className="font-normal text-sm cursor-pointer">CBD</Label>
                    </div>
                     <span className="text-sm text-muted-foreground">{cbdCount}</span>
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
