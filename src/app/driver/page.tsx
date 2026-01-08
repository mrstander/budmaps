
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, Map, CheckCircle } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: <Clock className="h-10 w-10 text-primary" />,
    title: 'Flexible Hours',
    description: 'Work when you want, where you want. Be your own boss and set your own schedule.',
  },
  {
    icon: <DollarSign className="h-10 w-10 text-primary" />,
    title: 'Earn Great Money',
    description: 'Get competitive earnings, plus 100% of your tips. Get paid weekly for your deliveries.',
  },
  {
    icon: <Map className="h-10 w-10 text-primary" />,
    title: 'Drive Your City',
    description: 'Discover your city while you deliver. All you need is a reliable vehicle and a smartphone.',
  },
];

export default function DrivePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 text-center text-white bg-gray-800">
            <Image 
                src="https://images.unsplash.com/photo-1532004252750-b411a84c8a41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxkcml2ZXJ8ZW58MHx8fHwxNzY2NTk1MDg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Person driving a car at sunset"
                fill
                className="object-cover opacity-30"
                data-ai-hint="driving car"
            />
            <div className="relative container mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter font-headline">
                    Drive with budmaps
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-white/80">
                    Start earning on your own schedule. Deliver cannabis from local dispensaries to customers in your city.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/driver/register">Start Earning Now</Link>
                </Button>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Your Road, Your Rules</h2>
              <p className="mt-2 text-lg text-muted-foreground max-w-3xl mx-auto">
                Driving with budmaps gives you the freedom and flexibility to earn money on your terms.
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

        {/* How It Works Section */}
         <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Easy to Get Started</h2>
                    <p className="mt-2 text-lg text-muted-foreground max-w-3xl mx-auto">
                        Follow these simple steps to become a budmaps driver.
                    </p>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                    <div className="p-4">
                        <p className="text-5xl font-extrabold text-primary mb-4">1.</p>
                        <h3 className="text-xl font-bold mb-2">Sign Up</h3>
                        <p className="text-muted-foreground">Fill out the quick registration form with your details.</p>
                    </div>
                     <div className="p-4">
                        <p className="text-5xl font-extrabold text-primary mb-4">2.</p>
                        <h3 className="text-xl font-bold mb-2">Get Approved</h3>
                        <p className="text-muted-foreground">We'll review your application and get you on the road.</p>
                    </div>
                     <div className="p-4">
                        <p className="text-5xl font-extrabold text-primary mb-4">3.</p>
                        <h3 className="text-xl font-bold mb-2">Start Driving</h3>
                        <p className="text-muted-foreground">Log in, go online, and start accepting deliveries to earn money.</p>
                    </div>
                </div>
            </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-20 text-center bg-card">
             <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold tracking-tight font-headline">Ready to Hit the Road?</h2>
                <p className="mt-2 text-lg text-muted-foreground max-w-xl mx-auto">
                    Sign up today and start earning with budmaps.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/driver/register">Apply to Drive</Link>
                </Button>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
