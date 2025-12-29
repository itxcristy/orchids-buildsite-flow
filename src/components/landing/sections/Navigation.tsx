import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../fragments';
import { useSmoothScroll } from '../hooks';

const navLinks = [
  { label: 'Features', href: 'features' },
  { label: 'Pricing', href: 'pricing' },
  { label: 'FAQ', href: 'faq' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    scrollTo(href);
    setMobileOpen(false);
  };

  return (
    <header 
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled 
          ? 'bg-black/70 backdrop-blur-xl border-b border-white/[0.06]' 
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-[1120px] mx-auto px-6 h-[64px] flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <span className="text-black font-bold text-sm">D</span>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Drena</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((item, i) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className="relative px-4 py-2 text-[14px] text-[#888] hover:text-white transition-colors duration-200"
              style={{ transitionDelay: `${i * 30}ms` }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" href="/login">Sign in</Button>
          <Button variant="primary" href="/register" size="md">Get Started</Button>
        </div>

        <button 
          className="md:hidden p-2 -mr-2 text-[#888] hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="relative w-5 h-5">
            <Menu className={cn(
              'absolute inset-0 w-5 h-5 transition-all duration-300',
              mobileOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
            )} />
            <X className={cn(
              'absolute inset-0 w-5 h-5 transition-all duration-300',
              mobileOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'
            )} />
          </div>
        </button>
      </nav>

      <div className={cn(
        'md:hidden overflow-hidden transition-all duration-300',
        mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="bg-black/90 backdrop-blur-xl border-t border-white/[0.06] px-6 py-6 space-y-1">
          {navLinks.map((item, i) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'block w-full text-left py-3 text-[#888] hover:text-white transition-all duration-300',
                mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              )}
              style={{ transitionDelay: mobileOpen ? `${i * 50}ms` : '0ms' }}
            >
              {item.label}
            </button>
          ))}
          <div className={cn(
            'pt-4 border-t border-white/[0.06] space-y-3 transition-all duration-300',
            mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}
          style={{ transitionDelay: mobileOpen ? '150ms' : '0ms' }}
          >
            <Link to="/login" className="block text-[#888] py-2">Sign in</Link>
            <Link 
              to="/register" 
              className="block w-full py-2.5 text-center font-medium bg-white text-black rounded-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
