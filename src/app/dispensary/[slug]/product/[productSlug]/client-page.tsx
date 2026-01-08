

'use client';

import { useState, useMemo } from 'react';
import { Product, Dispensary, ProductPrice, EdibleProductPrice, SodaProductPrice } from '@/lib/types';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Leaf, Droplets, Info, Wind, Zap, UtensilsCrossed, HelpCircle, AlertTriangle, ChevronLeft, ChevronRight, Minus, Plus, Star, PowerOff } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { isDispensaryOpen } from '@/lib/is-dispensary-open';
import { cn } from '@/lib/utils';

const getPlaceholderImage = (id?: string) => {
  if (!id) {
    return { imageUrl: 'https://picsum.photos/seed/product/600/600', imageHint: 'product placeholder' };
  }
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/product/600/600', imageHint: 'product placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

const isSaleActive = (product: Product, selectedTier?: ProductPrice | EdibleProductPrice | SodaProductPrice | null) => {
    // Check for a product-level sale first (for non-tiered or as an override)
    if (product.salePrice && product.salePrice > 0) {
        return true;
    }
    // Then check for a tier-level sale
    if (selectedTier && 'salePrice' in selectedTier && selectedTier.salePrice && selectedTier.salePrice > 0) {
        return true;
    }
    return false;
}

const getLowestPriceForCard = (product: Product): { price: number; originalPrice?: number } => {
    const prices: number[] = [];
    const salePrices: number[] = [];
    let basePrice: number | undefined;

    if (product.type === 'Flower' && product.pricing?.length) {
        product.pricing.forEach(p => prices.push(p.price));
    } else if (product.type === 'Edible' && product.ediblePricing?.length) {
        product.ediblePricing.forEach(p => {
            if (p.salePrice) salePrices.push(p.salePrice);
            prices.push(p.price);
        });
    } else if (product.type === 'Soda' && product.sodaPricing?.length) {
        product.sodaPricing.forEach(p => {
            if (p.salePrice) salePrices.push(p.salePrice);
            prices.push(p.price);
        });
    } else {
        if (product.price) prices.push(product.price);
        if (product.salePrice) salePrices.push(product.salePrice);
    }
    
    const lowestSalePrice = salePrices.length > 0 ? Math.min(...salePrices) : null;
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

    if (lowestSalePrice) {
        return { price: lowestSalePrice, originalPrice: lowestPrice };
    }
    
    return { price: lowestPrice };
}


const ProductReviews = () => {
    // Placeholder data
    const reviews = [
        { name: 'Keira M.', rating: 5, comment: 'This product is amazing! Works wonders for my relaxation. Will definitely buy again!' },
        { name: 'Jake S.', rating: 5, comment: 'High quality and great taste. The effects are just what I was looking for.' },
        { name: 'Maria G.', rating: 5, comment: 'The gummies are delicious and the effect is very pleasant. Highly recommend.' },
    ];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Star className="text-primary fill-primary" /> 5.0 (11 Reviews)
                    </CardTitle>
                    <Button variant="outline">Write a review</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {reviews.map((review, index) => (
                    <div key={index}>
                        <div className="flex items-center mb-2">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
                                ))}
                            </div>
                            <p className="ml-4 font-semibold">{review.name}</p>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                        {index < reviews.length - 1 && <Separator className="mt-6" />}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function ProductDetailClient({ product, dispensary, relatedProducts }: { product: Product, dispensary: Dispensary, relatedProducts: Product[] }) {
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
  
  const isOpen = useMemo(() => isDispensaryOpen(dispensary), [dispensary]);

  const [quantity, setQuantity] = useState(1);
  const [selectedFlowerPrice, setSelectedFlowerPrice] = useState<ProductPrice | null>(
    product.type === 'Flower' && product.pricing && product.pricing.length > 0 ? product.pricing[0] : null
  );
  const [selectedEdiblePrice, setSelectedEdiblePrice] = useState<EdibleProductPrice | null>(
    product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0 ? product.ediblePricing[0] : null
  );
  const [selectedSodaPrice, setSelectedSodaPrice] = useState<SodaProductPrice | null>(
    product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0 ? product.sodaPricing[0] : null
  );
  
  const allImages = useMemo(() => [product.imageUrl, ...(product.additionalImageUrls || [])].filter(Boolean) as string[], [product]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { imageUrl: placeholderUrl, imageHint } = getPlaceholderImage(product.imageId);
  const displayImageUrl = allImages.length > 0 ? allImages[currentImageIndex] : placeholderUrl;

  const selectedTier = product.type === 'Flower' ? selectedFlowerPrice : product.type === 'Edible' ? selectedEdiblePrice : selectedSodaPrice;
  const onSale = isSaleActive(product, selectedTier);

  const stock = useMemo(() => {
    if (product.type === 'Flower') {
      return selectedFlowerPrice?.stock ?? 0;
    }
    if (product.type === 'Edible') {
      return selectedEdiblePrice?.stock ?? product.stock ?? 0;
    }
    if (product.type === 'Soda') {
      return selectedSodaPrice?.stock ?? product.stock ?? 0;
    }
    return product.stock || 0;
  }, [product, selectedFlowerPrice, selectedEdiblePrice, selectedSodaPrice]);


  const handleAddToCart = () => {
    let productToAdd: Product;
    let price;
    let weight; // This can be weight, strength, or flavour
    let tierStock = 0;
    
    if (product.type === 'Flower') {
      if (!selectedFlowerPrice) {
        toast({ variant: 'destructive', title: 'Please select a weight.' });
        return;
      }
      price = onSale && product.salePrice ? product.salePrice : selectedFlowerPrice.price;
      weight = selectedFlowerPrice.weight;
      tierStock = selectedFlowerPrice.stock;
      productToAdd = { ...product, price, weight, stock: tierStock };

    } else if (product.type === 'Edible') {
        if (product.ediblePricing && product.ediblePricing.length > 0) {
            if (!selectedEdiblePrice) {
                toast({ variant: 'destructive', title: 'Please select a strength.' });
                return;
            }
            price = selectedEdiblePrice.salePrice || selectedEdiblePrice.price;
            weight = selectedEdiblePrice.strength;
            tierStock = selectedEdiblePrice.stock;
        } else {
            price = onSale && product.salePrice ? product.salePrice : product.price;
            weight = product.weight;
            tierStock = product.stock || 0;
        }
        productToAdd = { ...product, price, weight, stock: tierStock };
    } else if (product.type === 'Soda') {
        if (product.sodaPricing && product.sodaPricing.length > 0) {
            if (!selectedSodaPrice) {
                toast({ variant: 'destructive', title: 'Please select a flavour.' });
                return;
            }
            price = selectedSodaPrice.salePrice || selectedSodaPrice.price;
            weight = selectedSodaPrice.flavour;
            tierStock = selectedSodaPrice.stock;
        } else {
            price = onSale && product.salePrice ? product.salePrice : product.price;
            weight = product.flavour; // Fallback to base flavour if any
            tierStock = product.stock || 0;
        }
        productToAdd = { ...product, price, weight, stock: tierStock };
    }
    else {
      price = onSale && product.salePrice ? product.salePrice : product.price;
      productToAdd = { ...product, price, stock: product.stock };
    }
    
    addToCart(productToAdd, dispensary, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name}${productToAdd.weight ? ` (${productToAdd.weight})` : ''} from ${dispensary.name}`,
    });
  };

  const nextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + allImages.length) % allImages.length);
    }
  };

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => {
        const newQuantity = prev + amount;
        if (newQuantity < 1) return 1;
        if (newQuantity > stock) return stock;
        return newQuantity;
    })
  }

  const finalPrice = useMemo(() => {
    if (product.type === 'Flower' && selectedFlowerPrice) {
        return product.salePrice || selectedFlowerPrice.price;
    }
    if (product.type === 'Edible') {
        if (selectedEdiblePrice) {
            return selectedEdiblePrice.salePrice || selectedEdiblePrice.price;
        }
        return product.salePrice || product.price || 0;
    }
    if (product.type === 'Soda') {
        if (selectedSodaPrice) {
            return selectedSodaPrice.salePrice || selectedSodaPrice.price;
        }
        return product.salePrice || product.price || 0;
    }
    return product.salePrice || product.price || 0;
  }, [product, selectedFlowerPrice, selectedEdiblePrice, selectedSodaPrice]);


  const originalPrice = useMemo(() => {
    if (product.type === 'Flower' && selectedFlowerPrice && product.salePrice) {
      return selectedFlowerPrice.price;
    }
    if (product.type === 'Edible' && selectedEdiblePrice?.salePrice) {
      return selectedEdiblePrice.price;
    }
     if (product.type === 'Soda' && selectedSodaPrice?.salePrice) {
      return selectedSodaPrice.price;
    }
    if (product.type !== 'Flower' && !product.ediblePricing?.length && !product.sodaPricing?.length && product.salePrice) {
      return product.price;
    }
    return null;
  }, [product, selectedFlowerPrice, selectedEdiblePrice, selectedSodaPrice]);

  const isActionDisabled = stock <= 0 || !canShop || !isOpen;

  return (
    <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dispensary/${dispensary.slug}`}>{dispensary.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="lg:col-span-1">
            <div className="flex flex-col-reverse md:flex-row gap-4">
                <div className="flex md:flex-col gap-2 overflow-auto">
                    {allImages.map((img, index) => (
                        <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-16 h-16 relative rounded-md overflow-hidden border-2 flex-shrink-0 focus:outline-none ${index === currentImageIndex ? 'border-primary' : 'border-transparent'}`}>
                            <Image src={img} alt={`Thumbnail ${index+1}`} fill className="object-cover" />
                             {index !== currentImageIndex && <div className="absolute inset-0 bg-black/40" />}
                        </button>
                    ))}
                </div>
                <div className="relative aspect-square flex-1 group">
                    <Image src={displayImageUrl} alt={product.name} fill className="object-cover rounded-lg border" data-ai-hint={imageHint} />
                     {onSale && (
                        <Badge className="absolute top-2 left-2" variant="destructive">SALE</Badge>
                    )}
                     {allImages.length > 1 && (
                      <>
                        <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 hover:text-white" onClick={prevImage}><ChevronLeft /></Button>
                        <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 hover:text-white" onClick={nextImage}><ChevronRight /></Button>
                      </>
                    )}
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-primary fill-primary" />)}
                </div>
                <span className="text-muted-foreground text-sm">(11 reviews)</span>
            </div>
          </div>
          
           <div className="flex items-baseline gap-2">
               <span className={`text-3xl font-bold ${originalPrice ? 'text-destructive' : ''}`}>
                    R{finalPrice.toFixed(2)}
                </span>
              {originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                      R{originalPrice.toFixed(2)}
                  </span>
              )}
            </div>
            
          {!isOpen && (
            <div className="flex items-center gap-2 text-destructive font-semibold p-3 bg-destructive/10 rounded-md">
                <PowerOff className="w-5 h-5" />
                <span>This dispensary is currently closed.</span>
            </div>
          )}

          {product.type === 'Flower' && product.pricing && product.pricing.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Select Weight</Label>
                    <RadioGroup 
                        value={selectedFlowerPrice?.weight}
                        onValueChange={(value) => setSelectedFlowerPrice(product.pricing?.find(p => p.weight === value) || null)}
                        className="flex flex-wrap gap-2"
                    >
                        {product.pricing.map((tier) => (
                            <div key={tier.weight}>
                                <RadioGroupItem value={tier.weight} id={`weight-${tier.weight}`} className="sr-only" disabled={tier.stock <= 0} />
                                <Label htmlFor={`weight-${tier.weight}`} className="px-4 py-2 border rounded-md cursor-pointer data-[state=checked]:bg-primary/20 data-[state=checked]:border-primary has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
                                    {tier.weight}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}
            
            {product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Select Strength</Label>
                    <RadioGroup 
                        value={selectedEdiblePrice?.strength}
                        onValueChange={(value) => setSelectedEdiblePrice(product.ediblePricing?.find(p => p.strength === value) || null)}
                        className="flex flex-wrap gap-2"
                    >
                        {product.ediblePricing.map((tier) => (
                            <div key={tier.strength}>
                                <RadioGroupItem value={tier.strength} id={`strength-${tier.strength}`} className="sr-only" disabled={tier.stock <= 0}/>
                                <Label htmlFor={`strength-${tier.strength}`} className="px-4 py-2 border rounded-md cursor-pointer data-[state=checked]:bg-primary/20 data-[state=checked]:border-primary has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
                                    {tier.strength}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}

            {product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Select Flavour</Label>
                    <RadioGroup 
                        value={selectedSodaPrice?.flavour}
                        onValueChange={(value) => setSelectedSodaPrice(product.sodaPricing?.find(p => p.flavour === value) || null)}
                        className="flex flex-wrap gap-2"
                    >
                        {product.sodaPricing.map((tier) => (
                            <div key={tier.flavour}>
                                <RadioGroupItem value={tier.flavour} id={`flavour-${tier.flavour}`} className="sr-only" disabled={tier.stock <= 0}/>
                                <Label htmlFor={`flavour-${tier.flavour}`} className="px-4 py-2 border rounded-md cursor-pointer data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
                                    {tier.flavour}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}
            
            <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-md">
                    <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-bold">{quantity}</span>
                     <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} disabled={quantity >= stock}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                 <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={isActionDisabled}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {stock <= 0 ? 'Out of Stock' : !isOpen ? 'Dispensary Closed' : canShop ? 'Add to Cart' : 'Not available'}
                </Button>
            </div>
                    
          <Accordion type="single" collapsible defaultValue='description' className="w-full">
            <AccordionItem value="description">
                <AccordionTrigger>Description</AccordionTrigger>
                <AccordionContent className="space-y-4 text-muted-foreground">
                   <div className="flex items-center gap-4">
                      {product.strain && <div><Badge variant={product.strain === 'Indica' ? 'destructive' : product.strain === 'Sativa' ? 'secondary' : 'default'} className="w-fit text-sm">{product.strain}</Badge></div>}
                       <div>{product.type}</div>
                   </div>
                   {(product.thc || product.cbd) && (
                    <div className="flex items-center gap-4">
                        <Droplets className="w-5 h-5 text-primary" />
                        <p>THC: {product.thc || 0}% | CBD: {product.cbd || 0}%</p>
                    </div>
                   )}
                  <p className="text-sm">{product.description}</p>
                </AccordionContent>
            </AccordionItem>
             {product.type === 'Edible' && (product.effectsLength || product.flavour || product.benefits || product.ingredients) && (
                <AccordionItem value="edible-details">
                    <AccordionTrigger>Edible Details</AccordionTrigger>
                    <AccordionContent className="space-y-4 text-muted-foreground">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {product.effectsLength && <div className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> <p><span className="font-semibold text-foreground">Effects Length:</span> {product.effectsLength}</p></div>}
                            {product.flavour && <div className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-primary" /> <p><span className="font-semibold text-foreground">Flavour:</span> {product.flavour}</p></div>}
                            {product.benefits && <div className="flex items-center gap-2"><Wind className="w-5 h-5 text-primary" /> <p><span className="font-semibold text-foreground">Benefits:</span> {product.benefits}</p></div>}
                        </div>
                        {product.ingredients && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Info className="w-5 h-5 text-primary" />Ingredients</h4>
                                <p className="text-sm">{product.ingredients}</p>
                            </div>
                       )}
                    </AccordionContent>
                </AccordionItem>
             )}
          </Accordion>

        </div>
      </div>
      
      <Separator className="my-12" />

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">Reviews</h2>
        <ProductReviews />
      </div>

       {relatedProducts && relatedProducts.length > 0 && (
         <>
            <Separator className="my-12" />
            <div className="space-y-8">
                <h2 className="text-2xl font-bold text-center">Related Products</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {relatedProducts.slice(0, 4).map(relatedProduct => {
                        const { imageUrl, imageHint } = getPlaceholderImage(relatedProduct.imageId);
                        const displayImageUrl = relatedProduct.imageUrl || imageUrl;
                        const { price, originalPrice } = getLowestPriceForCard(relatedProduct);
                        const relatedOnSale = !!originalPrice;
                        
                        return (
                            <Card key={relatedProduct.id} className="overflow-hidden group">
                                <a href={`/dispensary/${dispensary.slug}/product/${relatedProduct.slug || relatedProduct.id}`} className="contents">
                                    <div className="aspect-square relative">
                                        <Image src={displayImageUrl} alt={relatedProduct.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
                                         {relatedOnSale && <Badge variant="destructive" className="absolute top-2 left-2">SALE</Badge>}
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{relatedProduct.name}</h3>
                                        <div className="flex items-baseline gap-2">
                                            <p className={`font-semibold ${relatedOnSale ? 'text-destructive' : ''}`}>R{price.toFixed(2)}</p>
                                            {originalPrice && <p className="text-muted-foreground text-sm line-through">R{originalPrice.toFixed(2)}</p>}
                                        </div>
                                    </CardContent>
                                </a>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </>
       )}

    </main>
  );
}
