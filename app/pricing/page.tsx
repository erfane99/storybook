'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';

export default function PricingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out StoryCanvas',
      features: [
        '1 storybook included',
        '$3 to enable sharing',
        '$5 per additional story',
        'Standard image quality',
        'Basic art styles',
        'Email support'
      ],
      limitations: [
        'No downloads',
        'Limited art styles',
        'Standard support'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Essentials',
      price: '$10',
      period: 'per month',
      description: 'For regular storytellers',
      features: [
        '3 storybooks per month',
        'Unlimited sharing',
        'Download as PDF',
        'High quality images',
        'All art styles',
        'Email support',
        '$5 per additional story'
      ],
      popular: true,
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
    },
    {
      name: 'Pro',
      price: '$18',
      period: 'per month',
      description: 'For serious creators',
      features: [
        '10 storybooks per month',
        'Unlimited sharing',
        'Download as PDF',
        'Highest quality images',
        'All art styles',
        'Priority support',
        'Early access to new features',
        'Custom backgrounds',
        'Voice narration (coming soon)',
        '$5 per additional story'
      ],
      buttonText: 'Upgrade to Pro',
      buttonVariant: 'outline' as const,
    }
  ];

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      router.push('/auth/register');
      return;
    }

    // Handle subscription logic here
    router.push(`/checkout/${tier.toLowerCase()}`);
  };

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
              <Card 
                key={tier.name} 
                className={`relative ${tier.popular ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader>
                  {tier.popular && (
                    <div className="absolute top-0 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <CardTitle className="flex items-baseline">
                    <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
                    <span className="text-sm font-semibold leading-6 text-muted-foreground">/{tier.period}</span>
                  </CardTitle>
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
                    {tier.limitations?.map((limitation) => (
                      <li key={limitation} className="flex items-start text-muted-foreground">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="ml-3 text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.buttonVariant}
                    onClick={() => handleSubscribe(tier.name)}
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                <span className="text-sm font-medium">Professional Printing Available</span>
                <Badge variant="secondary">$40 per book</Badge>
              </div>
              <p className="text-base leading-7 text-muted-foreground">
                All plans include a 14-day free trial. No credit card required.
                Need something different? <Button variant="link" className="font-semibold" onClick={() => router.push('/contact')}>Contact us</Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}