'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out StoryCanvas',
      features: [
        'Create up to 3 storybooks',
        'Basic cartoon art style',
        'Up to 5 scenes per story',
        'Standard resolution images',
        'Email support'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Pro',
      price: '$9.99',
      description: 'For regular storytellers and educators',
      features: [
        'Unlimited storybooks',
        'Multiple art styles',
        'Up to 15 scenes per story',
        'High resolution images',
        'Priority support',
        'Download as PDF',
        'Voice narration',
        'Custom backgrounds'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
      popular: true,
    },
    {
      name: 'Team',
      price: '$24.99',
      description: 'For schools and organizations',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Shared story library',
        'Analytics dashboard',
        'Bulk export',
        'Custom branding',
        'API access',
        'Dedicated support'
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'outline' as const,
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Choose the perfect plan for your storytelling needs. All plans include our core AI-powered story generation features.
            </p>
          </div>
          
          <div className="isolate mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card key={tier.name} className={tier.popular ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  {tier.popular && (
                    <div className="absolute top-0 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
                    <span className="text-sm font-semibold leading-6 text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="ml-3 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.buttonVariant}
                    onClick={() => router.push('/auth/register')}
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="text-base leading-7 text-muted-foreground">
              All plans include a 14-day free trial. No credit card required.
              Need something different? <Button variant="link" className="font-semibold" onClick={() => router.push('/contact')}>Contact us</Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}