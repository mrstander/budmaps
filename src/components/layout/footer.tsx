
import Link from 'next/link';
import { MapPin, Twitter, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  const footerLinks = [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Cookie Policy', href: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Help Center', href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
             <Link href="/" className="flex items-center space-x-2">
                <MapPin className="h-8 w-8 text-primary" />
                <span className="font-bold text-lg">budmaps</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">Your guide to the world of cannabis.</p>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold tracking-wide">{section.title}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} budmaps. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></Link>
            <Link href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={20} /></Link>
            <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
