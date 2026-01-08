
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import type { Product, SodaProductPrice } from '@/lib/types';
import { PlusCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const pricingSchema = z.object({
  weight: z.string().min(1, 'Weight is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
});

const ediblePricingSchema = z.object({
  strength: z.string().min(1, 'Strength is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  salePrice: z.coerce.number().optional().or(z.literal(0)).or(z.literal('')),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
});

const sodaPricingSchema = z.object({
  flavour: z.string().min(1, 'Flavour is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  salePrice: z.coerce.number().optional().or(z.literal(0)).or(z.literal('')),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Description is required.'),
  slug: z.string().optional(),
  type: z.enum(['Flower', 'Vape', 'Edible', 'Concentrate', 'Pre-roll', 'Soda']),
  strain: z.enum(['Sativa', 'Indica', 'Hybrid']).optional(),
  thc: z.coerce.number().min(0, 'THC must be a positive number').optional(),
  cbd: z.coerce.number().min(0, 'CBD must be a positive number').optional(),
  price: z.coerce.number().optional(),
  weight: z.string().optional(),
  pricing: z.array(pricingSchema).optional(),
  ediblePricing: z.array(ediblePricingSchema).optional(),
  sodaPricing: z.array(sodaPricingSchema).optional(),
  imageUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  additionalImageUrls: z.array(z.object({ value: z.string().url('Must be a valid URL') })).optional(),
  stock: z.coerce.number().min(0, 'Stock must be a positive number'),
  effectsLength: z.string().optional(),
  benefits: z.string().optional(),
  flavour: z.string().optional(),
  ingredients: z.string().optional(),
  salePrice: z.coerce.number().optional(),
});

const generateSlug = (name: string) => name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

interface EditProductSheetProps {
    product: Product | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onProductUpdate: () => void;
}

export default function EditProductSheet({ product, isOpen, onOpenChange, onProductUpdate }: EditProductSheetProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {},
    });
     const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'pricing'
    });
    const { fields: edibleFields, append: appendEdible, remove: removeEdible } = useFieldArray({
        control: form.control,
        name: 'ediblePricing'
    });
    const { fields: sodaFields, append: appendSoda, remove: removeSoda } = useFieldArray({
      control: form.control,
      name: 'sodaPricing'
    });
    const { fields: additionalImageFields, append: appendAdditionalImage, remove: removeAdditionalImage } = useFieldArray({
      control: form.control,
      name: "additionalImageUrls"
    });

    useEffect(() => {
        if (product) {
            form.reset({
                ...product,
                price: product.price || 0,
                stock: product.stock || 0,
                thc: product.thc || 0,
                cbd: product.cbd || 0,
                imageUrl: product.imageUrl || '',
                additionalImageUrls: product.additionalImageUrls?.map(url => ({ value: url })) || [],
                salePrice: product.salePrice || undefined,
            });
        }
    }, [product, form]);

    const { formState: { isSubmitting }, watch, control } = form;
    const productType = watch('type');

    const onSubmit = async (values: z.infer<typeof productSchema>) => {
        if (!firestore || !product || !product.dispensaryId) {
             toast({ variant: 'destructive', title: 'Error', description: 'Product or dispensary information is missing.' });
             return;
        };

        let dataToSave: any = { 
            ...values,
            slug: generateSlug(values.name),
            additionalImageUrls: values.additionalImageUrls?.map(url => url.value).filter(Boolean) || [],
        };
        
        if (values.type === 'Flower') {
            delete dataToSave.price;
            delete dataToSave.weight;
            delete dataToSave.stock;
            delete dataToSave.ediblePricing;
            delete dataToSave.sodaPricing;
        } else if (values.type === 'Edible') {
            delete dataToSave.price;
            delete dataToSave.weight;
            delete dataToSave.stock;
            delete dataToSave.pricing;
            delete dataToSave.sodaPricing;
            delete dataToSave.strain;
            
            if (dataToSave.ediblePricing) {
                dataToSave.ediblePricing = dataToSave.ediblePricing.map((tier: any) => ({
                    ...tier,
                    salePrice: tier.salePrice === undefined || tier.salePrice === null || tier.salePrice === 0 || tier.salePrice === '' ? null : tier.salePrice
                }));
            }

        } else if (values.type === 'Soda') {
            delete dataToSave.price;
            delete dataToSave.weight;
            delete dataToSave.stock;
            delete dataToSave.pricing;
            delete dataToSave.ediblePricing;
            delete dataToSave.strain;

            if (dataToSave.sodaPricing) {
                dataToSave.sodaPricing = dataToSave.sodaPricing.map((tier: any) => ({
                    ...tier,
                    salePrice: tier.salePrice === undefined || tier.salePrice === null || tier.salePrice === 0 || tier.salePrice === '' ? null : tier.salePrice
                }));
            }
        } else {
            delete dataToSave.pricing;
            delete dataToSave.ediblePricing;
            delete dataToSave.sodaPricing;
        }

        if (values.type !== 'Edible') {
            delete dataToSave.effectsLength;
            delete dataToSave.benefits;
            delete dataToSave.flavour;
            delete dataToSave.ingredients;
        }

        if (values.salePrice === undefined || values.salePrice === null || values.salePrice === 0) {
            dataToSave.salePrice = null;
        } else {
            dataToSave.salePrice = values.salePrice;
        }


        const productRef = doc(firestore, `dispensaries/${product.dispensaryId}/products/${product.id}`);
        try {
            await updateDoc(productRef, {
                ...dataToSave,
                updatedAt: serverTimestamp()
            });
            toast({ title: 'Product Updated', description: `${values.name} has been updated.` });
            onProductUpdate();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };

    if (!product) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                        <SheetHeader>
                            <SheetTitle>Edit Product</SheetTitle>
                            <SheetDescription>Update the details for {product.name}.</SheetDescription>
                        </SheetHeader>
                        <div className="flex-grow py-4 space-y-4 pr-6">
                            <FormField control={control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Product Name</FormLabel> <FormControl><Input placeholder="e.g., OG Kush" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            
                            <FormField control={control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Main Image URL</FormLabel> <FormControl><Input placeholder="https://example.com/image.jpg" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                            
                            <div className="space-y-4 rounded-md border p-4">
                                <FormLabel>Additional Image URLs</FormLabel>
                                {additionalImageFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`additionalImageUrls.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                    <FormControl>
                                                        <Input placeholder="https://example.com/image.jpg" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalImage(index)}>
                                            <XCircle className="text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAdditionalImage({ value: '' })}>
                                    <PlusCircle className="mr-2" /> Add Image URL
                                </Button>
                            </div>


                            <FormField control={control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="Describe the product..." {...field} value={field.value || ''}/></FormControl> <FormMessage /> </FormItem> )} />
                            <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Flower">Flower</SelectItem>
                                      <SelectItem value="Vape">Vape</SelectItem>
                                      <SelectItem value="Edible">Edible</SelectItem>
                                      <SelectItem value="Soda">Soda</SelectItem>
                                      <SelectItem value="Concentrate">Concentrate</SelectItem>
                                      <SelectItem value="Pre-roll">Pre-roll</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {productType !== 'Edible' && productType !== 'Soda' && (
                                <FormField
                                control={control}
                                name="strain"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Strain</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select strain" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="Sativa">Sativa</SelectItem>
                                        <SelectItem value="Indica">Indica</SelectItem>
                                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            )}
                            </div>
                             {productType === 'Flower' ? (
                                <div className="space-y-4 rounded-md border p-4">
                                    <FormLabel>Pricing per Gram</FormLabel>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                            <FormField control={control} name={`pricing.${index}.weight`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Weight</FormLabel> <FormControl><Input placeholder="e.g., 1g" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`pricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="120" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`pricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> </FormItem> )} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><XCircle className="text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ weight: '', price: 0, stock: 0 })}><PlusCircle className="mr-2" /> Add Tier</Button>
                                </div>
                            ) : productType === 'Edible' ? (
                                <>
                                   <div className="space-y-4 rounded-md border p-4">
                                    <FormLabel>Pricing per Strength</FormLabel>
                                    {edibleFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                            <FormField control={control} name={`ediblePricing.${index}.strength`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Strength</FormLabel> <FormControl><Input placeholder="e.g., 10mg" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`ediblePricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="80" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`ediblePricing.${index}.salePrice`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sale Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="60" {...field} value={field.value ?? ''} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`ediblePricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> </FormItem> )} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEdible(index)}><XCircle className="text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendEdible({ strength: '', price: 0, stock: 0, salePrice: undefined })}><PlusCircle className="mr-2" /> Add Tier</Button>
                                </div>
                                  <Separator />
                                  <div className="space-y-4 rounded-md border p-4">
                                      <h4 className="font-medium">Edible Details (Optional)</h4>
                                      <FormField control={control} name="effectsLength" render={({ field }) => ( <FormItem> <FormLabel>Effects Length</FormLabel> <FormControl><Input placeholder="e.g., 2-4 hours" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                      <FormField control={control} name="benefits" render={({ field }) => ( <FormItem> <FormLabel>Benefits</FormLabel> <FormControl><Input placeholder="e.g., Relaxation, Sleep Aid" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                      <FormField control={control} name="flavour" render={({ field }) => ( <FormItem> <FormLabel>Flavour</FormLabel> <FormControl><Input placeholder="e.g., Strawberry" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                      <FormField control={control} name="ingredients" render={({ field }) => ( <FormItem> <FormLabel>Ingredients</FormLabel> <FormControl><Textarea placeholder="e.g., Sugar, Corn Syrup, Gelatin..." {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                  </div>
                                </>
                            ) : productType === 'Soda' ? (
                                <div className="space-y-4 rounded-md border p-4">
                                    <FormLabel>Pricing per Flavour</FormLabel>
                                    {sodaFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                            <FormField control={control} name={`sodaPricing.${index}.flavour`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Flavour</FormLabel> <FormControl><Input placeholder="e.g., Cherry" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`sodaPricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="35" {...field} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`sodaPricing.${index}.salePrice`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sale Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="30" {...field} value={field.value ?? ''} /></FormControl> </FormItem> )} />
                                            <FormField control={control} name={`sodaPricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> </FormItem> )} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSoda(index)}><XCircle className="text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendSoda({ flavour: '', price: 0, stock: 0, salePrice: undefined })}><PlusCircle className="mr-2" /> Add Tier</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={control} name="weight" render={({ field }) => ( <FormItem> <FormLabel>Weight</FormLabel> <FormControl><Input placeholder="e.g., 3.5g" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={control} name="thc" render={({ field }) => ( <FormItem> <FormLabel>THC (%) (Optional)</FormLabel> <FormControl><Input type="number" step="0.1" placeholder="22" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={control} name="cbd" render={({ field }) => ( <FormItem> <FormLabel>CBD (%) (Optional)</FormLabel> <FormControl><Input type="number" step="0.1" placeholder="0.5" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>

                             {productType !== 'Flower' && productType !== 'Edible' && productType !== 'Soda' && (
                                <FormField control={control} name="stock" render={({ field }) => ( <FormItem> <FormLabel>Stock Amount</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                             )}
                        
                            {productType !== 'Edible' && productType !== 'Soda' && (
                                <>
                                <Separator />
                                <div className="space-y-4 rounded-md border p-4">
                                    <h4 className="font-medium">Product Sale</h4>
                                    <FormField control={control} name="salePrice" render={({ field }) => ( <FormItem> <FormLabel>Sale Price (R) (Optional)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="99.99" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                </div>
                                </>
                            )}
                        </div>
                        <SheetFooter className="mt-auto">
                           <SheetClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </SheetClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
};
