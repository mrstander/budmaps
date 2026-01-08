
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const generalFaqs = [
  {
    question: 'How do I place an order?',
    answer: 'Simply browse for products, add them to your cart, and proceed to checkout. You will need to create an account to complete your purchase.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We currently accept Cash on Delivery for all orders. Your driver will collect payment when they deliver your items.',
  },
  {
    question: 'Is my personal information secure?',
    answer: 'Yes, we take your privacy very seriously. All personal information is encrypted and stored securely. We never share your data with third parties.',
  },
];

const vendorFaqs = [
  {
    question: 'How do I become a vendor on budmaps?',
    answer: 'You can register as a vendor by clicking the "Sell on budmaps" link in our website footer and completing the registration form. Our team will review your application.',
  },
  {
    question: 'What are the fees for selling on the platform?',
    answer: 'We charge a competitive commission of 5.5% on each successful order placed through our platform. There are no monthly subscription fees or listing fees.',
  },
];

const driverFaqs = [
  {
    question: 'How do I sign up to be a driver?',
    answer: 'Visit our "Drive for budmaps" page, linked in the footer, to find all the information and a link to the driver registration form.',
  },
  {
    question: 'How and when do I get paid?',
    answer: 'Drivers are paid weekly via direct deposit for all completed deliveries. You keep 100% of your tips.',
  },
];

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-muted/20 text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Find answers to common questions about our marketplace, becoming a vendor, or driving with us.
            </p>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-6">General Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                {generalFaqs.map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-6">For Vendors</h2>
              <Accordion type="single" collapsible className="w-full">
                {vendorFaqs.map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">For Drivers</h2>
              <Accordion type="single" collapsible className="w-full">
                {driverFaqs.map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
