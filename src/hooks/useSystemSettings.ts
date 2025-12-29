import { useState, useEffect } from 'react';
import { fetchSystemSettings, type SystemSettings } from '@/services/system-settings';

/**
 * Hook to fetch and apply system settings throughout the application
 * This hook can be used to apply SEO, analytics, branding, etc.
 */
export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSystemSettings();
        setSettings(data);
        
        // Apply SEO settings to document head
        if (data.meta_title) {
          document.title = data.meta_title;
        }
        
        if (data.meta_description) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', data.meta_description);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = data.meta_description;
            document.head.appendChild(meta);
          }
        }
        
        if (data.meta_keywords) {
          const metaKeywords = document.querySelector('meta[name="keywords"]');
          if (metaKeywords) {
            metaKeywords.setAttribute('content', data.meta_keywords);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'keywords';
            meta.content = data.meta_keywords;
            document.head.appendChild(meta);
          }
        }
        
        // Apply Open Graph tags
        if (data.og_title) {
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute('content', data.og_title);
          } else {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:title');
            meta.content = data.og_title;
            document.head.appendChild(meta);
          }
        }
        
        if (data.og_description) {
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) {
            ogDesc.setAttribute('content', data.og_description);
          } else {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:description');
            meta.content = data.og_description;
            document.head.appendChild(meta);
          }
        }
        
        if (data.og_image_url) {
          const ogImage = document.querySelector('meta[property="og:image"]');
          if (ogImage) {
            ogImage.setAttribute('content', data.og_image_url);
          } else {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:image');
            meta.content = data.og_image_url;
            document.head.appendChild(meta);
          }
        }
        
        // Apply Twitter Card tags
        if (data.twitter_card_type) {
          const twitterCard = document.querySelector('meta[name="twitter:card"]');
          if (twitterCard) {
            twitterCard.setAttribute('content', data.twitter_card_type);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'twitter:card';
            meta.content = data.twitter_card_type;
            document.head.appendChild(meta);
          }
        }
        
        if (data.twitter_site) {
          const twitterSite = document.querySelector('meta[name="twitter:site"]');
          if (twitterSite) {
            twitterSite.setAttribute('content', data.twitter_site);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'twitter:site';
            meta.content = data.twitter_site;
            document.head.appendChild(meta);
          }
        }
        
        // Apply favicon
        if (data.favicon_url) {
          const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
          if (favicon) {
            favicon.setAttribute('href', data.favicon_url);
          } else {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = data.favicon_url;
            document.head.appendChild(link);
          }
        }
        
        // Apply analytics scripts
        if (data.google_analytics_id) {
          // Remove existing GA script if any
          const existingGA = document.querySelector('script[data-ga-id]');
          if (existingGA) {
            existingGA.remove();
          }
          
          // Add Google Analytics
          const script1 = document.createElement('script');
          script1.async = true;
          script1.src = `https://www.googletagmanager.com/gtag/js?id=${data.google_analytics_id}`;
          script1.setAttribute('data-ga-id', data.google_analytics_id);
          document.head.appendChild(script1);
          
          const script2 = document.createElement('script');
          script2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${data.google_analytics_id}');
          `;
          script2.setAttribute('data-ga-id', data.google_analytics_id);
          document.head.appendChild(script2);
        }
        
        if (data.google_tag_manager_id) {
          // Remove existing GTM script if any
          const existingGTM = document.querySelector('script[data-gtm-id]');
          if (existingGTM) {
            existingGTM.remove();
          }
          
          // Add Google Tag Manager
          const script1 = document.createElement('script');
          script1.innerHTML = `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${data.google_tag_manager_id}');
          `;
          script1.setAttribute('data-gtm-id', data.google_tag_manager_id);
          document.head.appendChild(script1);
          
          const noscript = document.createElement('noscript');
          noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${data.google_tag_manager_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
          document.body.insertBefore(noscript, document.body.firstChild);
        }
        
        if (data.facebook_pixel_id) {
          // Remove existing Facebook Pixel if any
          const existingFB = document.querySelector('script[data-fb-pixel-id]');
          if (existingFB) {
            existingFB.remove();
          }
          
          // Add Facebook Pixel
          const script = document.createElement('script');
          script.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${data.facebook_pixel_id}');
            fbq('track', 'PageView');
          `;
          script.setAttribute('data-fb-pixel-id', data.facebook_pixel_id);
          document.head.appendChild(script);
          
          const noscript = document.createElement('noscript');
          noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${data.facebook_pixel_id}&ev=PageView&noscript=1"/>`;
          document.body.insertBefore(noscript, document.body.firstChild);
        }
        
        // Apply custom tracking code
        if (data.custom_tracking_code) {
          // Remove existing custom tracking code if any
          const existingCustom = document.querySelector('script[data-custom-tracking]');
          if (existingCustom) {
            existingCustom.remove();
          }
          
          const script = document.createElement('script');
          script.innerHTML = data.custom_tracking_code;
          script.setAttribute('data-custom-tracking', 'true');
          document.head.appendChild(script);
        }
        
      } catch (err: any) {
        console.error('[useSystemSettings] Error loading system settings:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  return { settings, loading, error };
};

