
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Search, MapPin, User, ShoppingCart, LogOut, Shield, Truck, Store, Settings, Package, Map } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/hooks/use-search';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="transition-colors hover:text-foreground/80 text-foreground/60">
    {children}
  </Link>
);

export default function Header() {
  const { itemCount, handleSignOut } = useCart();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc(userDocRef);
  const isVendor = userData?.role === 'vendor';
  const isAdmin = userData?.role === 'admin';
  const isDriver = userData?.role === 'driver';

  const onSignOut = async () => {
    await handleSignOut();
    router.push('/');
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { dispensaries, products, isLoading } = useSearch(searchQuery);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchFocused(false);
    }
  };

  const canShop = !isVendor && !isAdmin && !isDriver;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">budmaps</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink href="/dispensaries">Dispensaries</NavLink>
            <NavLink href="/brands">Brands</NavLink>
            <NavLink href="/products">Products</NavLink>
          </nav>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0 sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <Link href="/" className="flex items-center space-x-2 p-4 border-b">
                <MapPin className="h-6 w-6 text-primary" />
                <span className="font-bold">budmaps</span>
              </Link>
              <nav className="flex flex-col gap-4 p-4 text-lg">
                <NavLink href="/dispensaries">Dispensaries</NavLink>
                <NavLink href="/brands">Brands</NavLink>
                <NavLink href="/products">Products</NavLink>
                <hr className="my-2 border-border" />
                {user ? (
                  <>
                    {isVendor && <NavLink href="/vendor/dashboard">Vendor Dashboard</NavLink>}
                    {isAdmin && <NavLink href="/admin/dashboard">Admin Dashboard</NavLink>}
                    {isDriver && <NavLink href="/driver/dashboard">Driver Dashboard</NavLink>}
                    <button onClick={onSignOut} className="text-left">Logout</button>
                  </>
                ) : (
                  <NavLink href="/login">Login / Sign Up</NavLink>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="w-full flex-1 md:w-auto md:flex-none relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search dispensaries, products..."
                className="pl-9 w-full md:w-64 lg:w-96"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
            </form>

            {/* Search Dropdown Results */}
            {isSearchFocused && (searchQuery.length >= 2) && (
              <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg z-[60] max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">Searching...</div>
                ) : (dispensaries.length === 0 && products.length === 0) ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">No results found</div>
                ) : (
                  <div className="py-2">
                    {dispensaries.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispensaries</div>
                        {dispensaries.map((d) => (
                          <Link
                            key={d.id}
                            href={`/dispensary/${d.slug || d.id}`}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                            onClick={() => setIsSearchFocused(false)}
                          >
                            <Store className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{d.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {products.length > 0 && (
                      <div className={dispensaries.length > 0 ? "mt-2 pt-2 border-t border-border" : ""}>
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products</div>
                        {products.map((p) => (
                          <Link
                            key={p.id}
                            href={`/dispensary/${p.dispensaryId || 'unknown'}`} // Navigate to dispensary for now as product detail page might not exist yet or varies
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                            onClick={() => setIsSearchFocused(false)}
                          >
                            <Package className="h-4 w-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.category}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-border px-3 pb-1">
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        className="text-xs text-primary hover:underline font-medium"
                        onClick={() => setIsSearchFocused(false)}
                      >
                        View all results for "{searchQuery}"
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <nav className="flex items-center">
            {canShop && (
              <Button variant="ghost" size="icon" aria-label="Shopping Cart" className="relative" asChild>
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="User Profile">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">My Account</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isVendor && (
                    <DropdownMenuItem asChild>
                      <Link href="/vendor/dashboard" className='flex items-center'>
                        <Store className="mr-2 h-4 w-4" />
                        Vendor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className='flex items-center'>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isDriver && (
                    <DropdownMenuItem asChild>
                      <Link href="/driver/dashboard" className='flex items-center'>
                        <Truck className="mr-2 h-4 w-4" />
                        Driver Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canShop && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/orders">
                          <Package className="mr-2 h-4 w-4" />
                          <span>My Orders</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" aria-label="User Profile" asChild>
                <Link href="/login"><User className="h-5 w-5" /></Link>
              </Button>
            )}

          </nav>
        </div>
      </div>
    </header>
  );
}
