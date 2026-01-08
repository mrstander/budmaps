
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Users, Zap, CheckCircle, BarChart, DollarSign } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: 'Reach a Wider Audience',
    description: 'Connect with thousands of local cannabis enthusiasts actively looking for products like yours.',
  },
  {
    icon: <Zap className="h-10 w-10 text-primary" />,
    title: 'Streamline Your Operations',
    description: 'Manage your menu, track orders, and handle deliveries all from one intuitive dashboard.',
  },
  {
    icon: <AreaChart className="h-10 w-10 text-primary" />,
    title: 'Grow Your Business',
    description: 'Leverage our marketing tools and analytics to gain insights, boost sales, and expand your brand.',
  },
];

const testimonials = [
    {
        name: 'Sarah L.',
        dispensary: 'Green Leaf Organics',
        comment: 'Joining budmaps was a game-changer for us. Our online orders have tripled, and we\'ve reached a whole new customer base we couldn\'t have on our own.'
    },
    {
        name: 'Mike P.',
        dispensary: 'The Chronic Corner',
        comment: 'The vendor dashboard is incredibly easy to use. Updating our menu takes minutes, and the sales analytics have been invaluable for our growth strategy.'
    }
]

export default function SellPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 text-center text-white bg-gray-800">
            <Image 
                src="https://images.unsplash.com/photo-1604660660171-f4ed868c41b2?q=80&w=2070&auto=format&fit=crop"
                alt="Modern dispensary interior"
                fill
                className="object-cover opacity-30"
                data-ai-hint="dispensary counter"
            />
            <div className="relative container mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter font-headline">
                    Grow Your Dispensary with budmaps
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-white/80">
                    Join the fastest-growing cannabis marketplace and connect with more customers than ever before.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/vendor/register">Get Started Today</Link>
                </Button>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Everything You Need to Succeed</h2>
              <p className="mt-2 text-lg text-muted-foreground max-w-3xl mx-auto">
                Our platform provides powerful tools to help you manage and grow your business, so you can focus on what you do best.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="text-center p-6">
                  <div className="flex items-center justify-center h-20 w-20 bg-primary/10 rounded-full mx-auto mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
         <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight font-headline">Simple, Transparent Pricing</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            No setup fees, no monthly charges. We only make money when you do. Our success is tied to yours.
                        </p>
                         <ul className="mt-6 space-y-4">
                            <li className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <span className="text-lg">5.5% commission on all completed sales</span>
                            </li>
                             <li className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <span className="text-lg">Easy-to-understand weekly payouts</span>
                            </li>
                             <li className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <span className="text-lg">No hidden costs or long-term contracts</span>
                            </li>
                        </ul>
                    </div>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-center">budmaps Commission</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-6xl font-extrabold">5.5<span className="text-4xl">%</span></p>
                            <p className="text-muted-foreground mt-2">Per order placed through our platform.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-card">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight font-headline">From Our Partners</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {testimonials.map((t, i) => (
                        <Card key={i} className="bg-background">
                            <CardContent className="p-8">
                                <p className="italic text-muted-foreground mb-6">"{t.comment}"</p>
                                <p className="font-bold">{t.name}</p>
                                <p className="text-sm text-primary">{t.dispensary}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-20 text-center">
             <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold tracking-tight font-headline">Ready to Join?</h2>
                <p className="mt-2 text-lg text-muted-foreground max-w-xl mx-auto">
                    Start selling to thousands of new customers today. Registration is fast, simple, and free.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/vendor/register">Create Your Vendor Account</Link>
                </Button>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
