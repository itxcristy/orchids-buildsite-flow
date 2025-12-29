import { useEffect, useRef } from 'react';

export function GridPattern() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.02]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }}
    />
  );
}

export function SpotlightGradient({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`absolute pointer-events-none ${className}`}
      style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59, 130, 246, 0.12), transparent 70%)',
      }}
    />
  );
}

export function GlowOrb({ 
  color = 'blue', 
  size = 400, 
  blur = 120,
  className = '' 
}: { 
  color?: 'blue' | 'violet' | 'emerald';
  size?: number;
  blur?: number;
  className?: string;
}) {
  const colors = {
    blue: 'rgba(59, 130, 246, 0.15)',
    violet: 'rgba(139, 92, 246, 0.15)',
    emerald: 'rgba(16, 185, 129, 0.15)',
  };

  return (
    <div 
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: colors[color],
        filter: `blur(${blur}px)`,
      }}
    />
  );
}

export function NoiseTexture() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

export function AnimatedBeam({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute overflow-hidden ${className}`}>
      <div 
        className="absolute h-[1px] w-[200px] animate-beam"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
        }}
      />
    </div>
  );
}

export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
    
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
    />
  );
}
