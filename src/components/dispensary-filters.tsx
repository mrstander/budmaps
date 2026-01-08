
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const filterGroups = [
    { name: 'Open now', type: 'button' },
    { name: 'Storefronts', type: 'button', active: true },
    { name: 'Delivery', type: 'button' },
    { name: 'Order online', type: 'button' },
    { name: 'Deals', type: 'button' },
    { name: 'Best of Weedmaps', type: 'button' },
    { name: 'Medical', type: 'button' },
    { name: 'Recreational', type: 'button' },
    { name: 'Curbside pickup', type: 'button' },
    { name: 'Products', type: 'dropdown', options: ['Flower', 'Vapes', 'Edibles'] },
    { name: 'Brand', type: 'dropdown', options: ['Brand A', 'Brand B', 'Brand C'] },
    { name: 'Amenities', type: 'dropdown', options: ['ATM', 'Security', 'Accessible'] },
]

export default function DispensaryFilters() {
    return null;
}
