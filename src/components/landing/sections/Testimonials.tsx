import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionTitle } from '../fragments';

const testimonials = [
  {
    id: 1,
    content: "Drena transformed how we manage our agency. What used to take hours now takes minutes. The all-in-one approach means we finally have visibility across every project and client.",
    author: "Priya Sharma",
    role: "Founder & CEO",
    company: "PixelCraft Studios",
    avatar: "PS",
    color: "bg-blue-500",
  },
  {
    id: 2,
    content: "The financial tracking alone saved us from hiring an additional accountant. GST compliance, invoicing, expense tracking – it's all seamless.",
    author: "Rahul Mehta",
    role: "Operations Director",
    company: "BrandWave Digital",
    avatar: "RM",
    color: "bg-emerald-500",
  },
  {
    id: 3,
    content: "We tried 5 different tools before Drena. Nothing else came close to understanding what an Indian agency actually needs day-to-day.",
    author: "Ananya Reddy",
    role: "Managing Partner",
    company: "CreativeMinds Agency",
    avatar: "AR",
    color: "bg-purple-500",
  },
  {
    id: 4,
    content: "Our team adoption was instant. The interface is intuitive, and the mobile app means I can approve invoices and check project status from anywhere.",
    author: "Vikram Singh",
    role: "Creative Director",
    company: "Spark Digital",
    avatar: "VS",
    color: "bg-orange-500",
  },
  {
    id: 5,
    content: "The ROI was immediate. Within the first month, we recovered the annual subscription cost just from the time saved on reporting.",
    author: "Neha Kapoor",
    role: "Finance Head",
    company: "GrowthLabs Media",
    avatar: "NK",
    color: "bg-pink-500",
  },
];

const StarRating = ({ count = 5 }: { count?: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const MobileCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying]);
  
  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };
  
  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };
  
  const testimonial = testimonials[currentIndex];
  
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-zinc-900/50 border border-white/[0.06]"
        >
          <Quote className="w-6 h-6 text-white/[0.08] mb-3" />
          
          <StarRating />
          
          <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
            "{testimonial.content}"
          </p>
          
          <div className="mt-4 flex items-center gap-3">
            <div className={`${testimonial.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs ring-2 ring-white/10`}>
              {testimonial.avatar}
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {testimonial.author}
              </div>
              <div className="text-xs text-zinc-500">
                {testimonial.role} · {testimonial.company}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsAutoPlaying(false);
                setCurrentIndex(i);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const TestimonialCard = ({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-zinc-900/50 border border-white/[0.06] group-hover:border-white/[0.1] transition-colors">
        <Quote className="w-8 h-8 text-white/[0.06] absolute top-6 right-6" />
        
        <StarRating />
        
        <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
          "{testimonial.content}"
        </p>
        
        <div className="mt-6 flex items-center gap-4">
          <div className={`${testimonial.color} w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/10`}>
            {testimonial.avatar}
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {testimonial.author}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {testimonial.role}
            </div>
            <div className="text-xs text-zinc-600 mt-0.5">
              {testimonial.company}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-16 sm:py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_50%)]" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionTitle
          badge="Testimonials"
          title="Loved by agencies across India"
          description="See what agency founders and teams have to say about transforming their operations with Drena."
        />
        
        <div className="mt-10 sm:mt-16 md:hidden">
          <MobileCarousel />
        </div>
        
        <div className="mt-16 hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={testimonial.id}
              testimonial={testimonial} 
              index={index}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-8 sm:mt-12 flex flex-col items-center"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500">
            <span>Join</span>
            <span className="text-white font-medium">500+ agencies</span>
            <span>already using Drena</span>
          </div>
          
          <div className="mt-4 hidden sm:flex items-center gap-6">
            {['PixelCraft', 'BrandWave', 'CreativeMinds', 'Spark Digital', 'GrowthLabs'].map((company, i) => (
              <motion.div
                key={company}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 0.5 } : {}}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ opacity: 1 }}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-colors cursor-default"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
