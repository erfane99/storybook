'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Book, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    // Scroll detection
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/examples', label: 'Examples' },
  ];

  // Don't render anything while checking auth status
  if (isLoading) {
    return null;
  }

  const renderAuthButtons = () => {
    if (user) {
      return (
        <>
          <Button variant="ghost" onClick={() => router.push('/storybook/library')}>
            My Stories
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="ghost" onClick={() => router.push('/auth')}>
          Sign In
        </Button>
        <Button onClick={() => router.push('/create')}>
          Get Started
        </Button>
      </>
    );
  };

  const renderMobileAuthButtons = () => {
    if (user) {
      return (
        <>
          <Button variant="outline" onClick={() => {
            router.push('/storybook/library');
            setIsOpen(false);
          }}>
            My Stories
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="outline" onClick={() => {
          router.push('/auth');
          setIsOpen(false);
        }}>
          Sign In
        </Button>
        <Button onClick={() => {
          router.push('/create');
          setIsOpen(false);
        }}>
          Get Started
        </Button>
      </>
    );
  };

  return (
    <header 
      className={cn(
        'fixed w-full z-50 transition-all duration-300 py-4',
        isScrolled ? 'bg-background/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="container flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Book className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">StoryCanvas</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />
          {renderAuthButtons()}
        </div>

        {/* Mobile navigation toggle */}
        <button 
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden pt-2 pb-4 px-8 bg-background/95 backdrop-blur-sm">
          <nav className="flex flex-col space-y-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                )}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col space-y-3">
              {renderMobileAuthButtons()}
              <div className="pt-2 flex justify-center">
                <ModeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}