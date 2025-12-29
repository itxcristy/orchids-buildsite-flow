import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Twitter, 
  Linkedin, 
  Instagram,
  Mail,
  MapPin,
  ArrowUpRight
} from 'lucide-react';

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers', badge: 'Hiring' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api' },
      { label: 'Templates', href: '/templates' },
      { label: 'Community', href: '/community' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' },
    ],
  },
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/drena', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/drena', label: 'LinkedIn' },
  { icon: Instagram, href: 'https://instagram.com/drena', label: 'Instagram' },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="relative border-t border-white/[0.06] bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.03),transparent_50%)]" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">D</span>
              </div>
              <span className="text-lg font-display font-semibold text-white">Drena</span>
            </Link>
            
            <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-xs">
              The all-in-one platform for modern agencies. Manage projects, track finances, and scale your business.
            </p>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@drena.io" className="hover:text-zinc-300 transition-colors">
                  hello@drena.io
                </a>
              </div>
              <div className="flex items-start gap-2 text-sm text-zinc-500">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Mumbai, India</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="text-sm font-medium text-zinc-300 mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {link.label}
                      {link.badge && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-zinc-600">
              <span>&copy; {currentYear} Drena. All rights reserved.</span>
              <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-700" />
              <span className="hidden md:flex items-center gap-1">
                Made with care in India
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-500">All systems operational</span>
              </div>
              
              <a
                href="https://status.drena.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1"
              >
                Status
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
