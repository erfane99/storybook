'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Baby, Users, User } from 'lucide-react';

interface Step4_AudienceProps {
  value: 'children' | 'young_adults' | 'adults';
  onChange: (value: 'children' | 'young_adults' | 'adults') => void;
}

const audiences = [
  {
    value: 'children',
    label: 'Children',
    description: 'Simple language, colorful illustrations, and positive themes',
    icon: Baby
  },
  {
    value: 'young_adults',
    label: 'Young Adults',
    description: 'More complex themes, dynamic illustrations, and engaging narratives',
    icon: Users
  },
  {
    value: 'adults',
    label: 'Adults',
    description: 'Sophisticated themes, detailed artwork, and mature storytelling',
    icon: User
  }
];

export function Step4_Audience({ value, onChange }: Step4_AudienceProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Target Audience</h3>
        <p className="text-muted-foreground mb-4">
          Choose who your story is primarily written for. This will affect the style and complexity.
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(val: 'children' | 'young_adults' | 'adults') => onChange(val)}
        className="space-y-4"
      >
        {audiences.map((audience) => {
          const Icon = audience.icon;
          return (
            <Card
              key={audience.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                value === audience.value ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={audience.value} id={audience.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5" />
                      <Label htmlFor={audience.value} className="font-medium text-lg cursor-pointer">
                        {audience.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {audience.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
}