import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Container } from '../fragments';
import { FadeIn } from '../animations';

const logos = [
  { name: 'TechVision', width: 'w-24' },
  { name: 'DigitalFirst', width: 'w-28' },
  { name: 'CloudNine', width: 'w-24' },
  { name: 'ScaleUp Labs', width: 'w-32' },
  { name: 'InnovatePro', width: 'w-28' },
  { name: 'GrowthEngine', width: 'w-32' },
];

export default function LogoCloud() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="py-16 border-y border-white/[0.06] overflow-hidden">
      <Container>
        <FadeIn isVisible={mounted} delay={100}>
          <p className="text-center text-[13px] text-[#666] mb-8 tracking-[0.02em] uppercase">
            Trusted by leading agencies
          </p>
        </FadeIn>
        
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          
          <InfiniteScroll />
        </div>
      </Container>
    </section>
  );
}

function InfiniteScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let position = 0;
    const speed = 0.4;

    const animate = () => {
      position += speed;
      const containerWidth = scrollContainer.scrollWidth / 2;
      
      if (position >= containerWidth) {
        position = 0;
      }
      
      scrollContainer.style.transform = `translateX(-${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex gap-16"
        style={{ width: 'max-content' }}
      >
        {[...logos, ...logos].map((logo, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center justify-center transition-colors duration-200',
              logo.width
            )}
          >
            <span className="text-[18px] font-medium text-[#333] hover:text-[#555] whitespace-nowrap select-none cursor-default">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
