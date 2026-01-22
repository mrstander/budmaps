'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

/* ------------------ Constants ------------------ */

const productTypes: Product['type'][] = [
  'Flower',
  'Vape',
  'Edible',
  'Concentrate',
  'Pre-roll',
  'Soda',
];

const strainTypes: Product['strain'][] = ['Sativa', 'Indica', 'Hybrid'];

const EMPTY_SET = new Set<string>();

/* ------------------ Helpers ------------------ */

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

const getBrands = (products: Product[]): string[] =>
  Array.from(
    new Set(
      products
        .map(p => p.brand)
        .filter((brand): brand is string => Boolean(brand))
    )
  );

/* ------------------ Props ------------------ */

interface ProductFiltersProps {
  products: Product[];
  onFilterChange: (filteredProducts: Product[]) => void;
  initialCategoryFilter?: Set<string>;
}

/* ------------------ Component ------------------ */

export default function ProductFilters({
  products,
  onFilterChange,
  initialCategoryFilter = EMPTY_SET,
}: ProductFiltersProps) {
  const [selectedTypes, setSelectedTypes] =
    useState<Set<string>>(initialCategoryFilter);

  const [selectedStrains, setSelectedStrains] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  /* ------------------ Filtering ------------------ */

  useEffect(() => {
    const noFiltersApplied =
      selectedTypes.size === 0 &&
      selectedStrains.size === 0 &&
      selectedBrands.size === 0;

    const filtered = products.filter(product => {
      const typeMatch =
        selectedTypes.size === 0 || selectedTypes.has(product.type);

      const strainMatch =
        selectedStrains.size === 0 ||
        (product.strain && selectedStrains.has(product.strain));

      const brandMatch =
        selectedBrands.size === 0 ||
        (product.brand && selectedBrands.has(product.brand));

      const stockMatch = noFiltersApplied
        ? getProductStock(product) > 0
        : true;

      return typeMatch && strainMatch && brandMatch && stockMatch;
    });

    onFilterChange(filtered);
  }, [
    selectedTypes,
    selectedStrains,
    selectedBrands,
    products,
    onFilterChange,
  ]);

  /* ------------------ Sync Initial Filters ------------------ */

  useEffect(() => {
    setSelectedTypes(initialCategoryFilter);
  }, [initialCategoryFilter]);

  /* ------------------ Handlers ------------------ */

  const toggleSetValue = (
    value: string,
    setFn: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setFn(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  /* ------------------ Memoised Data ------------------ */

  const brands = useMemo(() => getBrands(products), [products]);

  /* ------------------ UI ------------------ */

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter</CardTitle>
      </CardHeader>

      <CardContent>
        <Accordion
          type="multiple"
          defaultValue={['type', 'strain', 'brand']}
          className="w-full"
        >
          {/* CATEGORY */}
          <AccordionItem value="type">
            <AccordionTrigger className="text-base font-semibold">
              Category
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 pt-2">
                {productTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedTypes.has(type)}
                      onCheckedChange={() =>
                        toggleSetValue(type, setSelectedTypes)
                      }
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className="font-normal text-sm cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* STRAIN */}
          <AccordionItem value="strain">
            <AccordionTrigger className="text-base font-semibold">
              Strain
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 pt-2">
                {strainTypes.map(strain => (
                  <div key={strain} className="flex items-center space-x-2">
                    <Checkbox
                      id={`strain-${strain}`}
                      checked={selectedStrains.has(strain)}
                      onCheckedChange={() =>
                        toggleSetValue(strain, setSelectedStrains)
                      }
                    />
                    <Label
                      htmlFor={`strain-${strain}`}
                      className="font-normal text-sm cursor-pointer"
                    >
                      {strain}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* BRAND (ONLY IF EXISTS) */}
          {brands.length > 0 && (
            <AccordionItem value="brand">
              <AccordionTrigger className="text-base font-semibold">
                Brand
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 pt-2">
                  {brands.map(brand => (
                    <div key={brand} className="flex items-center space-x-2">
                      <Checkbox
                        id={`brand-${brand}`}
                        checked={selectedBrands.has(brand)}
                        onCheckedChange={() =>
                          toggleSetValue(brand, setSelectedBrands)
                        }
                      />
                      <Label
                        htmlFor={`brand-${brand}`}
                        className="font-normal text-sm cursor-pointer"
                      >
                        {brand}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
