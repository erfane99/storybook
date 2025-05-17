'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Download, Share2, Book, Sparkles, History, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { uploadImage } from '@/utils/uploadImage';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { getClientSupabase } from '@/lib/supabase/client';

interface CartoonizedImage {
  original: string;
  generated: string;
  timestamp?: number;
}

interface SupabaseImage {
  original_url: string;
  generated_url: string;
  created_at: string;
}

const cartoonStyles = [
  { value: 'comic-book', label: 'Comic Book', description: 'Bold lines and dynamic shading' },
  { value: 'anime', label: 'Anime', description: 'Japanese animation style' },
  { value: 'storybook', label: 'Storybook', description: 'Soft and whimsical' },
  { value: 'flat-illustration', label: 'Flat Illustration', description: 'Modern minimal style' },
  { value: 'semi-realistic', label: 'Semi-Realistic', description: 'Balanced realism and style' }
];

type AudienceType = 'children' | 'young_adults' | 'adults';

export default function CreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [cartoonizedImages, setCartoonizedImages] = useState<CartoonizedImage[]>([]);
  const [previousImages, setPreviousImages] = useState<SupabaseImage[]>([]);
  const [usePreviousImage, setUsePreviousImage] = useState(false);
  const [selectedCartoonUrl, setSelectedCartoonUrl] = useState<CartoonizedImage | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'download' | 'share' | null>(null);
  const [cartoonStyle, setCartoonStyle] = useState<string>('semi-realistic');
  const [audience, setAudience] = useState<AudienceType>('children');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    async function fetchUserImages() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('cartoon_images')
          .select('original_url, generated_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching images:', error);
          return;
        }

        setPreviousImages(data || []);
      } catch (err) {
        console.error('Failed to fetch images:', err);
      }
    }

    fetchUserImages();
  }, [user, supabase]);

  const saveProgress = () => {
    sessionStorage.setItem('storyProgress', JSON.stringify({
      title,
      story,
      timestamp: Date.now()
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setImages([file]);
    setIsProcessing(true);
    setUsePreviousImage(false);
    setSelectedCartoonUrl(null);

    try {
      const tempImageUrl = URL.createObjectURL(file);
      setCartoonizedImages([{ original: tempImageUrl, generated: '' }]);

      const result = await uploadImage(file, cartoonStyle, toast, user?.id);
      
      const newImage = {
        original: result.original,
        generated: result.generated
      };
      
      setCartoonizedImages([newImage]);

      toast({
        title: "Success",
        description: "Image successfully processed!"
      });
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process image"
      });

      setImages([]);
      setCartoonizedImages([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPreviousImage = (image: SupabaseImage) => {
    setSelectedCartoonUrl({
      original: image.original_url,
      generated: image.generated_url
    });
    setUsePreviousImage(true);
    setCartoonizedImages([]);
  };

  const handleClearSelection = () => {
    setSelectedCartoonUrl(null);
    setUsePreviousImage(false);
  };

  const handleStyleChange = async (newStyle: string) => {
    setCartoonStyle(newStyle);
    if (images.length > 0 && !usePreviousImage) {
      setIsProcessing(true);
      try {
        const result = await uploadImage(images[0], newStyle, toast, user?.id);
        const newImage = {
          original: result.original,
          generated: result.generated
        };
        setCartoonizedImages([newImage]);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update style"
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCreateStorybook = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title is required. Please enter a story title."
      });
      return;
    }

    if (!story.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please write your story first"
      });
      return;
    }

    const selectedImage = selectedCartoonUrl || cartoonizedImages[0];
    if (!selectedImage?.generated) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please upload an image or select a previous one"
      });
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/story/generate-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story,
          characterImage: selectedImage.generated,
          audience,
          isReusedImage: usePreviousImage
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scenes');
      }

      const { scenesText } = await response.json();
      const { pages } = JSON.parse(scenesText);

      const createResponse = await fetch('/api/story/create-storybook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          story,
          characterImage: selectedImage.generated,
          user_id: user?.id,
          pages,
          audience,
          isReusedImage: usePreviousImage
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create storybook');
      }

      const data = await createResponse.json();
      sessionStorage.setItem('storybook-data', JSON.stringify(data));
      router.push('/storybook/preview');
    } catch (error: any) {
      console.error('Error creating storybook:', error);
      setError(error.message || 'Failed to create storybook');
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to create storybook'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAction = (type: 'download' | 'share') => {
    if (!user) {
      setActionType(type);
      setShowAuthDialog(true);
      saveProgress();
    } else {
      if (type === 'download') {
        toast({
          title: "Download started",
          description: "Your storybook is being prepared for download"
        });
      } else {
        toast({
          title: "Share",
          description: "Opening share options"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Create Your Story</h1>
        
        <div className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="title">Story Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your story title"
              className="max-w-md"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Character Image</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={usePreviousImage}
                  onCheckedChange={setUsePreviousImage}
                  id="use-previous"
                />
                <Label htmlFor="use-previous" className="cursor-pointer">
                  <History className="h-4 w-4 inline mr-2" />
                  Reuse an earlier image?
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {usePreviousImage ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Previous Images</h3>
                  <div className="grid gap-4">
                    {previousImages.map((img, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-all ${
                          selectedCartoonUrl?.generated === img.generated_url
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => handleSelectPreviousImage(img)}
                      >
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-2">
                            <img
                              src={img.original_url}
                              alt="Original"
                              className="w-full h-32 object-cover rounded"
                            />
                            <img
                              src={img.generated_url}
                              alt="Cartoonized"
                              className="w-full h-32 object-cover rounded"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <RadioGroup
                    value={cartoonStyle}
                    onValueChange={handleStyleChange}
                    className="grid grid-cols-1 gap-2"
                  >
                    {cartoonStyles.map((style) => (
                      <label
                        key={style.value}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                          cartoonStyle === style.value ? 'border-primary bg-accent' : 'border-input'
                        }`}
                      >
                        <RadioGroupItem value={style.value} id={style.value} />
                        <div className="flex flex-col">
                          <span className="font-medium">{style.label}</span>
                          <span className="text-sm text-muted-foreground">{style.description}</span>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add Image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              )}

              <div className="space-y-4">
                {selectedCartoonUrl ? (
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Selected Image</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearSelection}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <img
                          src={selectedCartoonUrl.original}
                          alt="Original"
                          className="w-full h-32 object-cover rounded"
                        />
                        <img
                          src={selectedCartoonUrl.generated}
                          alt="Cartoonized"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : cartoonizedImages.length > 0 && (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative aspect-square">
                          <img
                            src={cartoonizedImages[0].original}
                            alt="Original"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                            Original
                          </div>
                        </div>
                        <div className="relative aspect-square">
                          {isProcessing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                              <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                          ) : cartoonizedImages[0].generated ? (
                            <>
                              <img
                                src={cartoonizedImages[0].generated}
                                alt="Cartoonized"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                                {cartoonStyles.find(s => s.value === cartoonStyle)?.label}
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted">
                              Processing...
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Select value={audience} onValueChange={(value: AudienceType) => setAudience(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="children">Children</SelectItem>
                <SelectItem value="young_adults">Young Adults</SelectItem>
                <SelectItem value="adults">Adults</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">Your Story</Label>
            <Textarea
              id="story"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Write your story here..."
              className="min-h-[200px]"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleCreateStorybook}
              disabled={isCreating || !story.trim() || (!selectedCartoonUrl && cartoonizedImages.length === 0)}
              className="w-full md:w-auto"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Storybook...
                </>
              ) : (
                <>
                  <Book className="mr-2 h-4 w-4" />
                  Create Storybook
                </>
              )}
            </Button>

            <Button
              onClick={() => handleAction('download')}
              variant="outline"
              className="w-full md:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            <Button
              onClick={() => handleAction('share')}
              variant="outline"
              className="w-full md:w-auto"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          {error && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="p-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign in to {actionType === 'download' ? 'Download' : 'Share'}</DialogTitle>
              <DialogDescription>
                Create an account to {actionType === 'download' ? 'download' : 'share'} your story and access it anytime.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Button
                className="w-full"
                onClick={() => router.push('/auth/register')}
              >
                Create Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreating}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Creating Your Story</DialogTitle>
              <DialogDescription>
                Our AI wizards are bringing your story to life. This may take a moment!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6"
              >
                <Sparkles className="h-12 w-12 text-primary" />
              </motion.div>
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
                className="w-full max-w-[200px] h-1 bg-primary/20 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}