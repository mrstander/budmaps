

import type { ElementType } from 'react';

export type Category = {
  id: string;
  name: string;
  imageId: string;
  icon: ElementType;
};

export type User = {
  id: string;
  email: string;
  createdAt: any;
  role: 'user' | 'vendor' | 'admin' | 'driver';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fcmTokens?: string[];
};

export type Driver = {
    id: string;
    userId: string;
    vehicleDetails?: string;
    availabilityStatus: 'online' | 'offline' | 'on-delivery';
    city: string;
    state: string;
    createdAt: any;
};

export type Dispensary = {
  id?: string;
  vendorId?: string;
  name:string;
  slug?: string;
  imageId?: string;
  location?: string;
  coordinates?: {
    top: string;
    left: string;
  };
  rating?: number;
  reviews?: number;
  type?: string;
  offers?: string[];
  address?: string;
  suburb?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  website?: string;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  categoryIds?: string[];
  isFeatured?: boolean;
  updatedAt?: string | null;
  createdAt?: any;
};

export type Region = {
  state: string;
  slug: string;
  cities: string[];
};

export type ProductPrice = {
  weight: string;
  price: number;
  stock: number;
}

export type EdibleProductPrice = {
  strength: string;
  price: number;
  salePrice?: number;
  stock: number;
}

export type Product = {
  id: string;
  dispensaryId?: string; 
  name: string;
  slug?: string;
  description?: string;
  type: 'Flower' | 'Edible' | 'Vape' | 'Concentrate' | 'Pre-roll';
  strain?: 'Indica' | 'Sativa' | 'Hybrid';
  thc?: number;
  cbd?: number;
  price?: number; // For non-flower, non-edible
  weight?: string; // For non-flower, non-edible
  pricing?: ProductPrice[]; // For flower
  ediblePricing?: EdibleProductPrice[]; // For edibles
  imageId: string;
  imageUrl?: string;
  additionalImageUrls?: string[];
  stock: number; // For non-tiered products
  createdAt: string | null;
  updatedAt?: any;
  // Edible-specific fields
  effectsLength?: string;
  benefits?: string;
  flavour?: string;
  ingredients?: string;
  // Sale fields
  salePrice?: number;
  isHotDeal?: boolean;
};

export type CartItem = {
  product: Product;
  dispensary: Dispensary;
  quantity: number;
};

export type OrderItem = {
  productId: string;
  name: string;
  weight: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  imageHint?: string;
}

export type Order = {
  id: string;
  dispensaryId: string;
  dispensaryName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  driverId?: string;
  items: OrderItem[];
  subtotal: number;
  taxes: number;
  deliveryFee: number;
  commission: number;
  vendorPayout: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  status: 'pending' | 'placed' | 'confirmed' | 'ready-for-pickup' | 'out-for-delivery' | 'completed' | 'cancelled';
  createdAt: any; // serverTimestamp will be used here
  confirmedAt?: any;
  pickedUpAt?: any;
  completedAt?: any;
  // Add address fields to the order for the driver
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};
