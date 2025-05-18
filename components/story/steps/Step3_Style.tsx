'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Step3_StyleProps {
  value: string;
  onChange: (value: string) => void;
}

const styles = [
  { value: 'storybook', label: 'Storybook', description: 'Soft, whimsical style with gentle colors and clean lines' },
  { value: 'semi-realistic', label: 'Semi-Realistic', description: 'Balanced style with smooth shading and accurate details' },
  { value: 'comic-book', label: 'Comic Book', description: 'Bold lines and dynamic shading inspired by comic books' },
  { value: 'flat-illustration', label: 'Flat Illustration', description: 'Modern minimal style with clean vector lines' },
  { value: 'anime', label: 'Anime', description: 'Japanese animation style with expressive features' },
];

export function Step3_Style({ value, onChange }: Step3_StyleProps) {
  return (
    <div className="px-2 md:px-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Art Style</h3>
        <p className="text-muted-foreground mb-4">
          Select the artistic style for your character illustrations.
        </p>
      </div>

      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 gap-4">
        {styles.map(style => (
          <Card key={style.value} className={`cursor-pointer transition-all hover:shadow-md ${value === style.value ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value={style.value} id={style.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={style.value} className="font-medium text-lg cursor-pointer">
                    {style.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
}