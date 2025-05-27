'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
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
  const [emailValidation, setEmailValidation] = useState<Validation>({
    isValid: false,
    message: ''
  });
  const [passwordValidation, setPasswordValidation] = useState<Validation>({
    isValid: false,
    message: ''
  });
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [strength, setStrength] = useState<PasswordStrength>({ 
    score: 0, 
    label: 'Too Weak', 
    color: 'bg-red-500' 
  });

  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router, supabase.auth]);

  useEffect(() => {
    // Check if passwords match whenever either password field changes
    setPasswordsMatch(password === confirmPassword || confirmPassword === '');
  }, [password, confirmPassword]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailValidation({ isValid: false, message: 'Email is required' });
    } else if (!emailRegex.test(email)) {
      setEmailValidation({ isValid: false, message: 'Please enter a valid email address' });
    } else {
      setEmailValidation({ isValid: true, message: 'Email format is valid' });
    }
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
    const strengths: PasswordStrength[] = [
      { score: 0, label: 'Too Weak', color: 'bg-red-500' },
      { score: 2, label: 'Weak', color: 'bg-orange-500' },
      { score: 4, label: 'Medium', color: 'bg-yellow-500' },
      { score: 6, label: 'Strong', color: 'bg-green-500' }
    ];
    const passwordStrength = strengths.reduce((prev, curr) =>
      score >= curr.score ? curr : prev
    );
    setStrength(passwordStrength);
  };

  useEffect(() => {
    validateEmail(email);
  }, [email]);

  useEffect(() => {
    validatePassword(password);
    checkPasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setShowTermsError(true);
      return;
    }
    if (!passwordsMatch) {
      return;
    }
    if (isSubmitting) return;
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

      // ✅ Insert profile
      if (data.user?.id) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          user_type: 'user'
        });
        if (profileError) throw new Error('Profile creation failed: ' + profileError.message);
      }

      toast({
        title: 'Welcome to StoryCanvas!',
        description: 'Please check your email to continue.'
      });

      router.push('/auth/verify-email');
    } catch (error: any) {
      toast.dismiss();
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message,
      });
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
          <p className="text-muted-foreground">
            Join our creative community and bring your stories to life
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              aria-invalid={email ? !emailValidation.isValid : undefined}
              aria-describedby="email-validation"
              className={`${
                email && (emailValidation.isValid ? 'border-green-500' : 'border-red-500')
              }`}
            />
            <p className="text-sm text-muted-foreground">We'll never share your email with anyone else</p>
            {email && (
              <p id="email-validation" className={`text-sm ${
                emailValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`} aria-live="polite">
                {emailValidation.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
                aria-invalid={password ? !passwordValidation.isValid : undefined}
                aria-describedby="password-validation password-strength"
                className={`pr-10 ${
                  password && (passwordValidation.isValid ? 'border-green-500' : 'border-red-500')
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your password stays private — we store it securely encrypted
            </p>
            {password && (
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${(strength.score / 6) * 100}%` }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={(strength.score / 6) * 100}
                  />
                </div>
                <p id="password-strength" className={`text-sm ${strength.color.replace('bg-', 'text-')}`} aria-live="polite">
                  Password Strength: {strength.label}
                </p>
                <p id="password-validation" className={`text-sm ${
                  passwordValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`} aria-live="polite">
                  {passwordValidation.message}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                aria-invalid={!passwordsMatch}
                aria-describedby="confirm-password-validation"
                className={`pr-10 ${
                  confirmPassword && (passwordsMatch ? 'border-green-500' : 'border-red-500')
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isSubmitting}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p id="confirm-password-validation" className="text-sm text-red-600" aria-live="polite">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => {
                  setAcceptedTerms(checked as boolean);
                  setShowTermsError(false);
                }}
                disabled={isSubmitting}
                aria-describedby="terms-error"
              />
              <label htmlFor="terms" className="text-sm leading-none">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-primary hover:underline">Terms</a> and{' '}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
              </label>
            </div>
            {showTermsError && (
              <p id="terms-error" className="text-sm text-red-600" aria-live="polite">
                Please accept the terms and privacy policy to continue
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !emailValidation.isValid || !passwordValidation.isValid || !passwordsMatch || !acceptedTerms}
            aria-disabled={isSubmitting || !emailValidation.isValid || !passwordValidation.isValid || !passwordsMatch || !acceptedTerms}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating your account...
              </span>
            ) : (
              'Join StoryCanvas'
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}