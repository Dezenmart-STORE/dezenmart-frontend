import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SEO_CONFIG, getCanonicalUrl } from "../utils/seo/seoConfig";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[] | readonly string[];
  image?: string;
  type?: string;
  noindex?: boolean;
  nofollow?: boolean;
  canonicalUrl?: string;
  structuredData?: object | object[];
}

/**
 * Custom hook for managing SEO meta tags
 * Updates document title and meta tags dynamically
 */
export const useSEO = ({
  title,
  description = SEO_CONFIG.defaultDescription,
  keywords = SEO_CONFIG.defaultKeywords,
  image,
  type = "website",
  noindex = false,
  nofollow = false,
  canonicalUrl,
  structuredData,
}: SEOProps = {}) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    const fullTitle = title
      ? `${title} | ${SEO_CONFIG.siteName}`
      : SEO_CONFIG.defaultTitle;
    document.title = fullTitle;

    // Update or create meta tags
    const updateMetaTag = (
      name: string,
      content: string,
      property?: boolean
    ) => {
      const attr = property ? "property" : "name";
      let element = document.querySelector(
        `meta[${attr}="${name}"]`
      ) as HTMLMetaElement;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    // Basic meta tags
    updateMetaTag("description", description);
    updateMetaTag("keywords", keywords.join(", "));

    // Robots meta tag
    const robotsContent = [
      noindex ? "noindex" : "index",
      nofollow ? "nofollow" : "follow",
      "max-snippet:-1",
      "max-image-preview:large",
      "max-video-preview:-1",
    ].join(", ");
    updateMetaTag("robots", robotsContent);
    updateMetaTag("googlebot", robotsContent);

    // Open Graph tags
    updateMetaTag("og:title", fullTitle, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:type", type, true);
    updateMetaTag("og:site_name", SEO_CONFIG.siteName, true);
    updateMetaTag(
      "og:url",
      canonicalUrl || getCanonicalUrl(location.pathname),
      true
    );

    const ogImage = image || `${SEO_CONFIG.siteUrl}${SEO_CONFIG.openGraph.images.default}`;
    updateMetaTag("og:image", ogImage, true);
    updateMetaTag("og:image:width", "1200", true);
    updateMetaTag("og:image:height", "630", true);
    updateMetaTag("og:image:alt", fullTitle, true);

    // Twitter Card tags
    updateMetaTag("twitter:card", SEO_CONFIG.twitterCard.cardType);
    updateMetaTag("twitter:site", SEO_CONFIG.twitterCard.site);
    updateMetaTag("twitter:creator", SEO_CONFIG.twitterCard.creator);
    updateMetaTag("twitter:title", fullTitle);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", ogImage);

    // Additional SEO tags
    updateMetaTag("author", SEO_CONFIG.siteName);
    updateMetaTag("publisher", SEO_CONFIG.siteName);
    updateMetaTag("theme-color", "#ef4444"); // Red theme color

    // Mobile optimization
    updateMetaTag(
      "viewport",
      "width=device-width, initial-scale=1.0, maximum-scale=5.0"
    );
    updateMetaTag("format-detection", "telephone=no");

    // Canonical URL
    let canonicalLink = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute(
      "href",
      canonicalUrl || getCanonicalUrl(location.pathname)
    );

    // Alternate language links (if multilingual in future)
    let alternateLang = document.querySelector(
      'link[rel="alternate"][hreflang="en"]'
    ) as HTMLLinkElement;
    if (!alternateLang) {
      alternateLang = document.createElement("link");
      alternateLang.setAttribute("rel", "alternate");
      alternateLang.setAttribute("hreflang", "en");
      document.head.appendChild(alternateLang);
    }
    alternateLang.setAttribute(
      "href",
      canonicalUrl || getCanonicalUrl(location.pathname)
    );

    // Structured Data (JSON-LD)
    if (structuredData) {
      const dataArray = Array.isArray(structuredData)
        ? structuredData
        : [structuredData];

      // Remove old structured data
      document
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((el) => el.remove());

      // Add new structured data
      dataArray.forEach((data) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }

    // Preconnect to external domains for performance
    const preconnectDomains = [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://api.coingecko.com",
    ];

    preconnectDomains.forEach((domain) => {
      let link = document.querySelector(
        `link[rel="preconnect"][href="${domain}"]`
      ) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "preconnect";
        link.href = domain;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    });
  }, [
    title,
    description,
    keywords,
    image,
    type,
    noindex,
    nofollow,
    canonicalUrl,
    location.pathname,
    structuredData,
  ]);

  return {
    updateTitle: (newTitle: string) => {
      document.title = `${newTitle} | ${SEO_CONFIG.siteName}`;
    },
  };
};

/**
 * Hook for adding structured data without other SEO changes
 */
export const useStructuredData = (data: object | object[]) => {
  useEffect(() => {
    const dataArray = Array.isArray(data) ? data : [data];
    const scripts: HTMLScriptElement[] = [];

    dataArray.forEach((item) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(item);
      document.head.appendChild(script);
      scripts.push(script);
    });

    return () => {
      scripts.forEach((script) => script.remove());
    };
  }, [data]);
};
