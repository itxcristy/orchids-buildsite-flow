import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { SectionTitle } from '../fragments';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I get started with Drena?',
        a: 'Simply sign up for a free 14-day trial. No credit card required. You can import your existing data or start fresh. Our onboarding wizard will guide you through setting up your workspace, inviting team members, and creating your first project.',
      },
      {
        q: 'Can I import data from other tools?',
        a: 'Yes! Drena supports importing data from popular tools like Asana, Trello, Monday.com, and spreadsheets. Our import wizard walks you through the process step by step.',
      },
      {
        q: 'How long does setup typically take?',
        a: 'Most agencies are up and running within an hour. Basic setup takes about 15 minutes, and you can always add more details later as you get comfortable with the platform.',
      },
    ],
  },
  {
    category: 'Billing',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards, UPI, net banking, and can also set up invoicing for annual plans. GST invoices are automatically generated for all Indian businesses.',
      },
      {
        q: 'Can I change plans later?',
        a: 'Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the credit will be applied to future invoices.',
      },
      {
        q: 'Is there a refund policy?',
        a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied within the first 30 days, we\'ll refund your payment in full, no questions asked.',
      },
    ],
  },
  {
    category: 'Security',
    questions: [
      {
        q: 'How secure is my data?',
        a: 'We take security seriously. All data is encrypted at rest and in transit using AES-256 encryption. We\'re SOC 2 Type II certified and undergo regular security audits. Your data is backed up daily across multiple geographic locations.',
      },
      {
        q: 'Where is my data stored?',
        a: 'Your data is stored in secure data centers in Mumbai, India, with automatic failover to backup locations. We comply with all Indian data localization requirements.',
      },
    ],
  },
];

const FAQItem = ({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) => {
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-zinc-400 leading-relaxed pr-8">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQ = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState(faqs[0].category);
  
  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const activeFaqs = faqs.find(f => f.category === activeCategory)?.questions || [];
  
  return (
    <section ref={ref} className="relative py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.05),transparent_50%)]" />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <SectionTitle
          badge="FAQ"
          title="Frequently asked questions"
          description="Everything you need to know about Drena. Can't find what you're looking for? Reach out to our team."
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="mt-10 flex items-center justify-center gap-2"
        >
          {faqs.map((faq) => (
            <button
              key={faq.category}
              onClick={() => setActiveCategory(faq.category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === faq.category
                  ? 'bg-white/[0.1] text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              {faq.category}
            </button>
          ))}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-10 rounded-2xl border border-white/[0.06] bg-zinc-900/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-6 lg:p-8">
            {activeFaqs.map((faq, index) => (
              <FAQItem
                key={`${activeCategory}-${index}`}
                question={faq.q}
                answer={faq.a}
                isOpen={openItems[`${activeCategory}-${index}`] || false}
                onToggle={() => toggleItem(`${activeCategory}-${index}`)}
              />
            ))}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <div className="text-zinc-300">Still have questions?</div>
              <a href="mailto:support@drena.io" className="text-blue-400 hover:text-blue-300 transition-colors">
                support@drena.io
              </a>
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-10 bg-white/[0.06]" />
          
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <div className="text-zinc-300">Chat with us</div>
              <span className="text-zinc-500">Live chat available 9am-6pm IST</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
