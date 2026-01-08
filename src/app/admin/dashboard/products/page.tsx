
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collectionGroup, getDocs, query, deleteDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import type { Product, Dispensary, SodaProductPrice } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Edit, Trash2, PlusCircle, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDispensaries } from '@/hooks/use-dispensaries';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditProductSheet from '@/components/shared/edit-product-sheet';
import ProductCsvImport from '@/components/shared/product-csv-import';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type ProductWithDispensary = Product & { dispensary: Dispensary };

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


export default function AdminProductsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allProducts, setAllProducts] = useState<ProductWithDispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispensaryId, setSelectedDispensaryId] = useState('all');
  const [adminSelectedDispensary, setAdminSelectedDispensary] = useState<string>('');

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { dispensaries, isLoading: dispensariesLoading } = useDispensaries();

  useEffect(() => {
    async function loadProducts() {
        if (!user || !firestore) {
            if (!isUserLoading) setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
            const dispensaryMap = new Map<string, Dispensary>();
            dispensaries.forEach(d => dispensaryMap.set(d.id!, d));

            const productsQuery = query(collectionGroup(firestore, 'products'));
            const querySnapshot = await getDocs(productsQuery);
            
            const fetchedProducts = querySnapshot.docs.map(doc => {
                const productData = doc.data() as Product;
                const dispensaryId = doc.ref.parent.parent!.id;
                const dispensary = dispensaryMap.get(dispensaryId);
                
                return {
                    ...productData,
                    id: doc.id,
                    dispensaryId: dispensaryId,
                    dispensary: dispensary || { name: 'Unknown', id: dispensaryId }
                } as ProductWithDispensary;
            });

            const sortedProducts = fetchedProducts.sort((a, b) => a.name.localeCompare(b.name));
            setAllProducts(sortedProducts);

        } catch (e: any) {
            console.error("Error fetching all products:", e);
            setError(e.message || "Failed to fetch products.");
        } finally {
            setIsLoading(false);
        }
    }
    if (!isUserLoading && !dispensariesLoading) {
        loadProducts();
    }
  }, [user, firestore, isUserLoading, dispensariesLoading, dispensaries, refreshKey]);

  useEffect(() => {
    if (dispensaries.length > 0) {
      setAdminSelectedDispensary(dispensaries[0].id!);
    }
  }, [dispensaries]);


  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const dispensaryMatch = selectedDispensaryId === 'all' || product.dispensaryId === selectedDispensaryId;
      return nameMatch && dispensaryMatch;
    });
  }, [allProducts, searchTerm, selectedDispensaryId]);

  const handleEditOpen = (product: Product) => {
    setProductToEdit(product);
    setIsEditSheetOpen(true);
  };
  
  const handleDeleteOpen = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteAlertOpen(true);
  };
  
  const handleDelete = async () => {
    if (!productToDelete || !firestore || !productToDelete.dispensaryId) return;
    const productRef = doc(firestore, 'dispensaries', productToDelete.dispensaryId, 'products', productToDelete.id);
    try {
        await deleteDoc(productRef);
        toast({ title: 'Product Deleted', description: `${productToDelete.name} has been removed.` });
        setProductToDelete(null);
        setIsDeleteAlertOpen(false);
        setRefreshKey(prev => prev + 1);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const getPriceDisplay = (product: Product) => {
    if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
      const minPrice = Math.min(...product.pricing.map(p => p.price));
      return `From R${minPrice.toFixed(2)}`;
    }
    if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
      const minPrice = Math.min(...product.ediblePricing.map(p => p.salePrice || p.price));
      return `From R${minPrice.toFixed(2)}`;
    }
    if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
      const minPrice = Math.min(...product.sodaPricing.map(p => p.salePrice || p.price));
      return `From R${minPrice.toFixed(2)}`;
    }
    const displayPrice = product.salePrice || product.price;
    return displayPrice ? `R${displayPrice.toFixed(2)}` : 'N/A';
  }

  const ProductRow = ({ product }: { product: ProductWithDispensary }) => (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>{product.dispensary.name}</TableCell>
      <TableCell>{product.type}</TableCell>
      <TableCell>{getPriceDisplay(product)}</TableCell>
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

    const addProductSchema = productSchema.extend({
      dispensaryId: z.string().min(1, { message: 'Please select a dispensary.' }),
  });

  const addProductForm = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      dispensaryId: adminSelectedDispensary || '', name: '', description: '', type: 'Flower',
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
  
  useEffect(() => {
    if (adminSelectedDispensary) {
      addProductForm.setValue('dispensaryId', adminSelectedDispensary);
    }
  }, [adminSelectedDispensary, addProductForm]);


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
    // This is already done in the schema, but as a safeguard.
    delete dataToSave.dispensaryId; 


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
      toast({ title: 'Product Added', description: `${values.name} has been added to the inventory.` });
      resetAddForm({
        dispensaryId: adminSelectedDispensary,
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


  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">All Products</h1>
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">All Products</TabsTrigger>
            <TabsTrigger value="add">Add Product</TabsTrigger>
            <TabsTrigger value="import">Import Products (CSV)</TabsTrigger>
          </TabsList>
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Platform Products</CardTitle>
                <CardDescription>
                  A list of all products from all dispensaries. Use the filters to narrow your search.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedDispensaryId} onValueChange={setSelectedDispensaryId} disabled={dispensariesLoading}>
                    <SelectTrigger className="w-full md:w-[240px]">
                      <SelectValue placeholder="Filter by dispensary..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dispensaries</SelectItem>
                      {dispensaries.map(d => (
                        <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Dispensary</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-destructive">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => <ProductRow key={`${product.dispensaryId}-${product.id}`} product={product} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          No products found matching your criteria.
                        </TableCell>
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
                    <CardTitle>Add New Product (Admin)</CardTitle>
                    <CardDescription>Fill out the details below to add a new product to a vendor's inventory.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                        control={addFormControl}
                        name="dispensaryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dispensary</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={dispensariesLoading}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select the dispensary for this product" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {dispensaries.map(d => (
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
                <CardTitle>Import Products via CSV</CardTitle>
                <CardDescription>
                  Select a dispensary, choose the product type, download the template, and upload your file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Dispensary to Import To</label>
                  <Select value={adminSelectedDispensary} onValueChange={setAdminSelectedDispensary} disabled={dispensariesLoading}>
                    <SelectTrigger className="w-full md:w-[280px]">
                        <SelectValue placeholder="Select a dispensary..." />
                    </SelectTrigger>
                    <SelectContent>
                        {dispensaries.map(d => <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {adminSelectedDispensary ? (
                  <ProductCsvImport 
                      dispensaryId={adminSelectedDispensary}
                      onImportComplete={() => setRefreshKey(prev => prev + 1)} 
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Please select a dispensary to begin the import process.</p>
                )}
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
