

'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Product, Dispensary } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, MapPin } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';

type ProductWithDispensary = Product & { dispensary: Dispensary };

interface DealProductCardProps {
    product: ProductWithDispensary;
}

const getPlaceholderImage = (id?: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  return image || { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
};

const getLowestPrice = (product: Product): { salePrice: number | null, originalPrice: number | null } => {
    let salePrice: number | null = null;
    let originalPrice: number | null = null;

    if (product.salePrice) {
        salePrice = product.salePrice;
        originalPrice = product.price || null;
    }

    if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
        const tierPrices = product.ediblePricing
            .filter(p => p.salePrice && p.salePrice > 0)
            .map(p => ({ salePrice: p.salePrice!, originalPrice: p.price }));

        if (tierPrices.length > 0) {
            const lowestTier = tierPrices.reduce((min, p) => p.salePrice < min.salePrice ? p : min, tierPrices[0]);
            if (salePrice === null || lowestTier.salePrice < salePrice) {
                salePrice = lowestTier.salePrice;
                originalPrice = lowestTier.originalPrice;
            }
        }
    }
    
    if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
        const tierPrices = product.sodaPricing
            .filter(p => p.salePrice && p.salePrice > 0)
            .map(p => ({ salePrice: p.salePrice!, originalPrice: p.price }));

        if (tierPrices.length > 0) {
            const lowestTier = tierPrices.reduce((min, p) => p.salePrice < min.salePrice ? p : min, tierPrices[0]);
            if (salePrice === null || lowestTier.salePrice < salePrice) {
                salePrice = lowestTier.salePrice;
                originalPrice = lowestTier.originalPrice;
            }
        }
    }
    
    if (salePrice === null && originalPrice === null && product.price) {
        originalPrice = product.price;
    }
    
    if (salePrice === null && product.price) {
        salePrice = product.price;
    }


    return { salePrice, originalPrice };
}


const DealProductCard = ({ product }: DealProductCardProps) => {
    const { addToCart } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData } = useDoc(userDocRef);
    const canShop = !userData || userData.role === 'user';
    
    const { imageUrl: placeholderUrl, imageHint } = getPlaceholderImage(product.imageId);
    const imageUrl = product.imageUrl || placeholderUrl;
    
    const productUrl = `/dispensary/${product.dispensary.slug}/product/${product.slug || product.id}`;
    
    const totalStock = useMemo(() => {
        if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
            return product.pricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
            return product.ediblePricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            return product.sodaPricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else {
            return product.stock || 0;
        }
    }, [product]);

    const { salePrice: displayPrice, originalPrice } = getLowestPrice(product);

    const handleAddToCart = () => {
        if (displayPrice === null) return;
        
        let productToAdd: Product;

        if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
             const firstTier = product.ediblePricing[0];
             productToAdd = {
                ...product,
                price: firstTier.salePrice || firstTier.price,
                weight: firstTier.strength,
                stock: firstTier.stock
             }
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            const firstTier = product.sodaPricing[0];
            productToAdd = {
                ...product,
                price: firstTier.salePrice || firstTier.price,
                weight: firstTier.flavour,
                stock: firstTier.stock
            }
        }
        else {
            productToAdd = {
                ...product,
                price: displayPrice,
                weight: product.weight || product.pricing?.[0]?.weight || '',
            }
        }
        
        addToCart(productToAdd, product.dispensary);
        toast({
            title: "Added to cart",
            description: `${product.name} from ${product.dispensary.name}`,
        });
    };
    
    const showOptionsButton = product.type === 'Flower' || 
                              (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) ||
                              (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0);

    return (
        <Card className="overflow-hidden flex flex-col group transition-shadow duration-300 hover:shadow-lg h-full">
            <Link href={productUrl} className="contents">
                <div className="aspect-square relative overflow-hidden">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
                    <Badge className="absolute top-2 left-2" variant="destructive">SALE</Badge>
                </div>
            </Link>
            <CardContent className="p-4 flex flex-col flex-grow">
                <Link href={`/dispensary/${product.dispensary.slug}`}>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                        <MapPin className="w-3.5 h-3.5" /> 
                        {product.dispensary.name}
                    </p>
                </Link>
                <Link href={productUrl} className="flex-grow">
                    <h3 className="font-semibold text-lg mt-1">{product.name}</h3>
                </Link>
                {(product.thc !== undefined || product.cbd !== undefined) && (
                    <div className="flex justify-between items-center mt-2 text-sm">
                        <span>THC: {product.thc}%</span>
                        <span>CBD: {product.cbd}%</span>
                    </div>
                )}
            </CardContent>
            <div className="p-4 pt-0">
               <div className="flex justify-between items-center font-semibold mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-destructive">
                      {`R${(displayPrice || 0).toFixed(2)}`}
                    </span>
                    {originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                         R{(originalPrice || 0).toFixed(2)}
                    </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">
                    {product.type === 'Flower' && product.pricing?.length
                      ? product.pricing[0].weight
                      : product.weight
                    }
                  </span>
              </div>
              {showOptionsButton ? (
                <Button className="w-full" asChild disabled={totalStock <= 0}>
                  <Link href={productUrl} className={!canShop ? 'pointer-events-none' : ''}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>
                    {totalStock > 0 ? (canShop ? 'Select options' : 'Not available') : 'Out of Stock'}
                  </Link>
                </Button>
              ) : (
                <Button className="w-full" onClick={handleAddToCart} disabled={totalStock <= 0 || !canShop}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>
                    {totalStock > 0 ? (canShop ? 'Add to cart' : 'Not available') : 'Out of Stock'}
                </Button>
              )}
            </div>
        </Card>
    );
};

export default DealProductCard;
