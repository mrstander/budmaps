

'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Product, Dispensary, SodaProductPrice } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit, PlusCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import EditProductSheet from '@/components/shared/edit-product-sheet';
import ProductCsvImport from '@/components/shared/product-csv-import';

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
  // Edible fields
  effectsLength: z.string().optional(),
  benefits: z.string().optional(),
  flavour: z.string().optional(),
  ingredients: z.string().optional(),
  // Sale fields
  salePrice: z.coerce.number().optional(),
});

const generateSlug = (name: string) => name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

export default function ProductsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [vendorDispensaries, setVendorDispensaries] = useState<Dispensary[]>([]);
  const [selectedDispensaryId, setSelectedDispensaryId] = useState<string | null>(null);
  const [isDispensaryLoading, setIsDispensaryLoading] = useState(true);

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchVendorDispensaries() {
      if (!user || !firestore) return;
      
      setIsDispensaryLoading(true);
      const dispensariesRef = collection(firestore, 'users', user.uid, 'dispensaries');
      const q = query(dispensariesRef);
      
      try {
        const querySnapshot = await getDocs(q);
        const dispensaries = querySnapshot.docs.map(doc => doc.data() as Dispensary);
        setVendorDispensaries(dispensaries);
        if (dispensaries.length > 0) {
            // Set the first dispensary as the default selected one
            setSelectedDispensaryId(dispensaries[0].id!);
        } else {
            setSelectedDispensaryId(null);
        }
      } catch (error) {
        console.error("Error fetching vendor's dispensaries:", error);
        setVendorDispensaries([]);
        setSelectedDispensaryId(null);
      } finally {
        setIsDispensaryLoading(false);
      }
    }

    if (user && firestore) {
        fetchVendorDispensaries();
    }
  }, [user, firestore, refreshKey]); // re-run when refreshKey changes

  const productsQuery = useMemoFirebase(() => {
    if (!selectedDispensaryId || !firestore) return null;
    return collection(firestore, 'dispensaries', selectedDispensaryId, 'products');
  }, [firestore, selectedDispensaryId, refreshKey]);

  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

  const addProductSchema = productSchema.extend({
      dispensaryId: z.string().min(1, { message: 'Please select a store.' }),
  });

  const addProductForm = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      dispensaryId: '', name: '', description: '', type: 'Flower',
      thc: undefined, cbd: undefined, price: 0, weight: '', stock: 0,
      pricing: [{ weight: '1g', price: 0, stock: 0 }],
      ediblePricing: [],
      sodaPricing: [],
      imageUrl: '', additionalImageUrls: [],
      effectsLength: '', benefits: '', flavour: '', ingredients: '',
      salePrice: undefined,
    },
  });

  const { control: addFormControl, formState: { isSubmitting }, reset: resetAddForm, watch: watchAddForm } = addProductForm;
  const addProductType = watchAddForm('type');
  const addProductDispensaryId = watchAddForm('dispensaryId');
  
  useEffect(() => {
    if (selectedDispensaryId) {
      addProductForm.setValue('dispensaryId', selectedDispensaryId);
    }
  }, [selectedDispensaryId, addProductForm]);


  const { fields: addPricingFields, append: addPricingAppend, remove: addPricingRemove } = useFieldArray({
      control: addFormControl,
      name: 'pricing'
  });

   const { fields: addEdiblePricingFields, append: addEdiblePricingAppend, remove: addEdiblePricingRemove } = useFieldArray({
      control: addFormControl,
      name: 'ediblePricing'
  });
  
  const { fields: addSodaPricingFields, append: addSodaPricingAppend, remove: addSodaPricingRemove } = useFieldArray({
      control: addFormControl,
      name: 'sodaPricing'
  });

   const { fields: addAdditionalImageFields, append: addAdditionalImageAppend, remove: addAdditionalImageRemove } = useFieldArray({
      control: addFormControl,
      name: 'additionalImageUrls'
  });

  async function onAddProduct(values: z.infer<typeof addProductSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to add a product.' });
      return;
    }
    
    const productCollectionRef = collection(firestore, 'dispensaries', values.dispensaryId, 'products');

    let dataToSave: any = { 
        ...values,
        dispensaryId: values.dispensaryId,
        slug: generateSlug(values.name),
        additionalImageUrls: values.additionalImageUrls?.map(url => url.value).filter(Boolean) || [],
    };
    // delete dataToSave.dispensaryId;

    if (values.type === 'Flower') {
        if (!values.pricing || values.pricing.length === 0) {
            toast({ variant: 'destructive', title: 'Pricing Error', description: 'Please add at least one price tier for Flower products.' });
            return;
        }
        delete dataToSave.price;
        delete dataToSave.weight;
        delete dataToSave.stock;
        delete dataToSave.ediblePricing;
        delete dataToSave.sodaPricing;
    } else if (values.type === 'Edible') {
        if (dataToSave.ediblePricing) {
            dataToSave.ediblePricing = dataToSave.ediblePricing.map((tier: any) => ({
                ...tier,
                salePrice: tier.salePrice === undefined || tier.salePrice === null || tier.salePrice === 0 || tier.salePrice === '' ? null : tier.salePrice
            }));
        }
        delete dataToSave.price;
        delete dataToSave.weight;
        delete dataToSave.stock;
        delete dataToSave.pricing;
        delete dataToSave.sodaPricing;
        delete dataToSave.strain;
    } else if (values.type === 'Soda') {
        if (dataToSave.sodaPricing) {
            dataToSave.sodaPricing = dataToSave.sodaPricing.map((tier: any) => ({
                ...tier,
                salePrice: tier.salePrice === undefined || tier.salePrice === null || tier.salePrice === 0 || tier.salePrice === '' ? null : tier.salePrice
            }));
        }
        delete dataToSave.price;
        delete dataToSave.weight;
        delete dataToSave.stock;
        delete dataToSave.pricing;
        delete dataToSave.ediblePricing;
        delete dataToSave.strain;
    } else {
        if (values.price === undefined || values.weight === undefined || values.stock === undefined) {
             toast({ variant: 'destructive', title: 'Information Error', description: 'Please provide price, weight, and stock for this product type.' });
            return;
        }
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

    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            dataToSave[key] = null;
        }
    });


    try {
      addDocumentNonBlocking(productCollectionRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Product Added', description: `${values.name} has been added to your inventory.` });
      resetAddForm({
        dispensaryId: addProductDispensaryId,
        name: '', description: '', type: 'Flower',
        thc: undefined, cbd: undefined, price: 0, weight: '', stock: 0,
        pricing: [{ weight: '1g', price: 0, stock: 0 }],
        ediblePricing: [],
        sodaPricing: [],
        imageUrl: '', additionalImageUrls: [],
        effectsLength: '', benefits: '', flavour: '', ingredients: '',
        salePrice: undefined,
      });
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to Add Product', description: error.message || 'An unknown error occurred.' });
    }
  }

  const handleDelete = async () => {
    if (!productToDelete || !firestore || !selectedDispensaryId) return;
    const productRef = doc(firestore, 'dispensaries', selectedDispensaryId, 'products', productToDelete.id);
    try {
        await deleteDoc(productRef);
        toast({ title: 'Product Deleted', description: `${productToDelete.name} has been removed from your inventory.` });
        setProductToDelete(null);
        setIsDeleteAlertOpen(false);
        setRefreshKey(prev => prev + 1);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };
  
  const handleEditOpen = (product: Product) => {
    setProductToEdit({ ...product, dispensaryId: selectedDispensaryId! });
    setIsEditSheetOpen(true);
  };
  
  const handleDeleteOpen = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteAlertOpen(true);
  };

  const isLoading = isUserLoading || areProductsLoading || isDispensaryLoading;

  const ProductRow = ({ product }: { product: Product }) => {
    let stockStatus = 'N/A';
    if (product.type === 'Flower' || (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0)) {
        const tiers = product.pricing || product.ediblePricing;
        if (tiers && tiers.length > 0) {
            const totalStock = tiers.reduce((sum, tier) => sum + tier.stock, 0);
            stockStatus = totalStock > 0 ? 'In Stock' : 'Out of Stock';
        } else {
            stockStatus = 'No Tiers';
        }
    } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
        const totalStock = product.sodaPricing.reduce((sum, tier) => sum + tier.stock, 0);
        stockStatus = totalStock > 0 ? 'In Stock' : 'Out of Stock';
    } else {
        stockStatus = product.stock > 0 ? `${product.stock}` : 'Out of Stock';
    }

    return (
        <TableRow>
          <TableCell className="font-medium">{product.name}</TableCell>
          <TableCell>{product.type}</TableCell>
          <TableCell>{product.strain || 'N/A'}</TableCell>
          <TableCell className={stockStatus === 'Out of Stock' ? 'text-destructive font-bold' : ''}>
              {stockStatus}
          </TableCell>
          <TableCell className="text-right">
            {product.type === 'Flower' 
              ? `${(product.pricing || []).length} tiers`
              : product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0
              ? `${(product.ediblePricing || []).length} tiers`
              : product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0
              ? `${(product.sodaPricing || []).length} tiers`
              : `R${(product.price || 0).toFixed(2)}`
            }
          </TableCell>
          <TableCell className="text-right font-semibold text-destructive">
              {product.salePrice ? `R${product.salePrice.toFixed(2)}` : 'N/A'}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditOpen(product)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteOpen(product)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
    );
};

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Your Inventory</TabsTrigger>
            <TabsTrigger value="add">Add Product</TabsTrigger>
            <TabsTrigger value="import">Import from CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Your Inventory</CardTitle>
                        <CardDescription>A list of all products available at your selected dispensary.</CardDescription>
                    </div>
                    {isDispensaryLoading ? (
                        <Skeleton className="h-10 w-48" />
                    ) : (
                        <Select
                            value={selectedDispensaryId || ''}
                            onValueChange={setSelectedDispensaryId}
                            disabled={vendorDispensaries.length === 0}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                                {vendorDispensaries.map(d => (
                                    <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Strain</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Original Price</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={7}>
                                <Skeleton className="h-5 w-full" />
                            </TableCell>
                        </TableRow>
                      ))
                    ) : !selectedDispensaryId ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                                Please add a store in the 'My Stores' tab before adding products.
                            </TableCell>
                        </TableRow>
                    ) : products && products.length > 0 ? (
                      products.map((product) => <ProductRow key={product.id} product={product} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">No products found for this store. Add your first product!</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="add">
            <Form {...addProductForm}>
              <form onSubmit={addProductForm.handleSubmit(onAddProduct)}>
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Product</CardTitle>
                    <CardDescription>Fill out the details below to add a new product to your inventory.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                        control={addFormControl}
                        name="dispensaryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Store</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={vendorDispensaries.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select the store for this product" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vendorDispensaries.map(d => (
                                            <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={addFormControl} name="name" render={({ field }) => ( <FormItem> <FormLabel>Product Name</FormLabel> <FormControl><Input placeholder="e.g., OG Kush" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    
                    <FormField control={addFormControl} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Main Image URL</FormLabel> <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    
                    <div className="space-y-4 rounded-md border p-4">
                        <FormLabel>Additional Image URLs</FormLabel>
                        {addAdditionalImageFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField
                                    control={addProductForm.control}
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
                                <Button type="button" variant="ghost" size="icon" onClick={() => addAdditionalImageRemove(index)}>
                                    <XCircle className="text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addAdditionalImageAppend({ value: '' })}>
                            <PlusCircle className="mr-2" /> Add Image URL
                        </Button>
                    </div>

                    
                    <FormField control={addFormControl} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="Describe the product..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addFormControl}
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
                      {addProductType !== 'Edible' && addProductType !== 'Soda' && (
                        <FormField
                            control={addFormControl}
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

                    {addProductType === 'Flower' ? (
                        <div className="space-y-4">
                            <Separator />
                            <FormLabel>Pricing Tiers (Weight)</FormLabel>
                            {addPricingFields.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                     <FormField control={addFormControl} name={`pricing.${index}.weight`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Weight</FormLabel> <FormControl><Input placeholder="e.g., 1g" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                     <FormField control={addFormControl} name={`pricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="120.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                     <FormField control={addFormControl} name={`pricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                     <Button type="button" variant="ghost" size="icon" onClick={() => addPricingRemove(index)}><XCircle className="text-destructive"/></Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => addPricingAppend({ weight: '', price: 0, stock: 0 })}>
                                <PlusCircle className="mr-2" /> Add Tier
                            </Button>
                            <Separator />
                        </div>
                    ) : addProductType === 'Edible' ? (
                        <>
                            <div className="space-y-4">
                                <Separator />
                                <FormLabel>Pricing Tiers (Strength)</FormLabel>
                                {addEdiblePricingFields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                        <FormField control={addFormControl} name={`ediblePricing.${index}.strength`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Strength</FormLabel> <FormControl><Input placeholder="e.g., 10mg" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={addFormControl} name={`ediblePricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="80.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={addFormControl} name={`ediblePricing.${index}.salePrice`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sale Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="60.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={addFormControl} name={`ediblePricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => addEdiblePricingRemove(index)}><XCircle className="text-destructive"/></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addEdiblePricingAppend({ strength: '', price: 0, stock: 0, salePrice: undefined })}>
                                    <PlusCircle className="mr-2" /> Add Tier
                                </Button>
                                <Separator />
                            </div>
                            <div className="space-y-4 rounded-md border p-4">
                                <h4 className="font-medium">Edible Details (Optional)</h4>
                                <FormField control={addFormControl} name="effectsLength" render={({ field }) => ( <FormItem> <FormLabel>Effects Length</FormLabel> <FormControl><Input placeholder="e.g., 2-4 hours" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={addFormControl} name="benefits" render={({ field }) => ( <FormItem> <FormLabel>Benefits</FormLabel> <FormControl><Input placeholder="e.g., Relaxation, Sleep Aid" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={addFormControl} name="flavour" render={({ field }) => ( <FormItem> <FormLabel>Flavour</FormLabel> <FormControl><Input placeholder="e.g., Strawberry" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={addFormControl} name="ingredients" render={({ field }) => ( <FormItem> <FormLabel>Ingredients</FormLabel> <FormControl><Textarea placeholder="e.g., Sugar, Corn Syrup, Gelatin..." {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                        </>
                    ) : addProductType === 'Soda' ? (
                       <div className="space-y-4">
                            <Separator />
                            <FormLabel>Pricing Tiers (Flavour)</FormLabel>
                            {addSodaPricingFields.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                    <FormField control={addFormControl} name={`sodaPricing.${index}.flavour`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Flavour</FormLabel> <FormControl><Input placeholder="e.g., Cherry" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={addFormControl} name={`sodaPricing.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="35.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={addFormControl} name={`sodaPricing.${index}.salePrice`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sale Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="30.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={addFormControl} name={`sodaPricing.${index}.stock`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Stock</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => addSodaPricingRemove(index)}><XCircle className="text-destructive"/></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => addSodaPricingAppend({ flavour: '', price: 0, stock: 0, salePrice: undefined })}>
                                <PlusCircle className="mr-2" /> Add Tier
                            </Button>
                            <Separator />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={addFormControl} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price (R)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={addFormControl} name="weight" render={({ field }) => ( <FormItem> <FormLabel>Weight</FormLabel> <FormControl><Input placeholder="e.g., 3.5g" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                    )}


                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={addFormControl} name="thc" render={({ field }) => ( <FormItem> <FormLabel>THC (%) (Optional)</FormLabel> <FormControl><Input type="number" step="0.1" placeholder="22" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={addFormControl} name="cbd" render={({ field }) => ( <FormItem> <FormLabel>CBD (%) (Optional)</FormLabel> <FormControl><Input type="number" step="0.1" placeholder="0.5" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                    </div>

                    {addProductType !== 'Flower' && addProductType !== 'Edible' && addProductType !== 'Soda' && (
                        <FormField control={addFormControl} name="stock" render={({ field }) => ( <FormItem> <FormLabel>Stock Amount</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    )}
                  
                    {addProductType !== 'Edible' && addProductType !== 'Soda' && (
                        <>
                        <Separator />
                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium">Product Sale</h4>
                            <FormField control={addFormControl} name="salePrice" render={({ field }) => ( <FormItem> <FormLabel>Sale Price (R) (Optional)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="99.99" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                        </>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Adding Product...' : 'Add Product'}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Import Products from CSV</CardTitle>
                <CardDescription>
                  Quickly add multiple products to your selected dispensary by uploading a CSV file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductCsvImport 
                    dispensaryId={selectedDispensaryId || ''}
                    onImportComplete={() => setRefreshKey(prev => prev + 1)} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <EditProductSheet
        product={productToEdit}
        isOpen={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        onProductUpdate={() => setRefreshKey(prev => prev + 1)}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the product "{productToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
