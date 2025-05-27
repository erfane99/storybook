'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

interface Validation {
  isValid: boolean;
  message: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [emailValidation, setEmailValidation] = useState<Validation>({ isValid: false, message: '' });
  const [passwordValidation, setPasswordValidation] = useState<Validation>({ isValid: false, message: '' });
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, label: 'Too Weak', color: 'bg-red-500' });

  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) router.push('/');
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router, supabase.auth]);

  useEffect(() => {
    setPasswordsMatch(password === confirmPassword || confirmPassword === '');
  }, [password, confirmPassword]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValidation(
      !email
        ? { isValid: false, message: 'Email is required' }
        : !emailRegex.test(email)
        ? { isValid: false, message: 'Please enter a valid email address' }
        : { isValid: true, message: 'Email format is valid' }
    );
  };

  const validatePassword = (password: string) => {
    const requirements = [
      { met: password.length >= 8, text: 'At least 8 characters' },
      { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
      { met: /[a-z]/.test(password), text: 'One lowercase letter' },
      { met: /[0-9]/.test(password), text: 'One number' },
      { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' }
    ];
    const unmet = requirements.filter(r => !r.met).map(r => r.text);
    setPasswordValidation({
      isValid: unmet.length === 0,
      message: unmet.length > 0 ? `Missing: ${unmet.join(', ')}` : 'Password meets all requirements'
    });
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score > 6) score = 6;
    const strengths: PasswordStrength[] = [
      { score: 0, label: 'Too Weak', color: 'bg-red-500' },
      { score: 2, label: 'Weak', color: 'bg-orange-500' },
      { score: 4, label: 'Medium', color: 'bg-yellow-500' },
      { score: 6, label: 'Strong', color: 'bg-green-500' }
    ];
    setStrength(strengths.reduce((prev, curr) => (score >= curr.score ? curr : prev)));
  };

  useEffect(() => validateEmail(email), [email]);
  useEffect(() => {
    validatePassword(password);
    checkPasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) return setShowTermsError(true);
    if (!passwordsMatch || isSubmitting) return;

    setIsSubmitting(true);
    toast.dismiss();

    const redirectUrl = `${window.location.origin}/auth/callback`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) throw error;

      if (data.user?.id) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          user_type: 'user'
        });
        if (profileError) throw new Error('Profile creation failed: ' + profileError.message);
      }

      toast({ title: 'Welcome to StoryCanvas!', description: 'Please check your email to continue.' });
      router.push('/auth/verify-email');
    } catch (error: any) {
      toast.dismiss();
      toast({ variant: 'destructive', title: 'Registration failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Let's Get You Started</h1>
          </div>
          <p className="text-muted-foreground">Join our creative community and bring your stories to life</p>
        </div>
        {/* Your form and rest of JSX remains the same */}
      </div>
    </div>
  );
}
