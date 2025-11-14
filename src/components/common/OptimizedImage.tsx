import { ImgHTMLAttributes, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  src: string;
  alt: string; // Made required for SEO
  width?: number | string;
  height?: number | string;
  lazy?: boolean;
  priority?: boolean;
  fallback?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  quality?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage Component
 *
 * SEO-optimized image component with:
 * - Lazy loading by default
 * - Proper alt text (required)
 * - Responsive image loading
 * - Fallback image support
 * - Loading skeleton
 * - Error handling
 *
 * @example
 * <OptimizedImage
 *   src="/product.jpg"
 *   alt="Product name - buy with crypto"
 *   width={300}
 *   height={300}
 *   lazy={true}
 * />
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  lazy = true,
  priority = false,
  fallback = "/images/placeholder.png",
  objectFit = "cover",
  quality = 85,
  className = "",
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(
    priority ? src : fallback
  );
  const [isLoading, setIsLoading] = useState(!priority);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // If priority image, load immediately
    if (priority) {
      setIsLoading(false);
      return;
    }

    // Preload image
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setImageSrc(fallback);
      setIsLoading(false);
      setHasError(true);
      onError?.();
      console.error(`Failed to load image: ${src}`);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallback, priority, onLoad, onError]);

  // Generate responsive srcset if width is provided
  const generateSrcSet = () => {
    if (!src || hasError) return undefined;

    // For external URLs, return as is
    if (src.startsWith('http')) {
      return undefined;
    }

    // For local images, generate responsive sizes
    const sizes = [320, 640, 768, 1024, 1280, 1536];
    const srcset = sizes
      .filter(size => !width || size <= (typeof width === 'number' ? width : parseInt(width as string)))
      .map(size => `${src}?w=${size} ${size}w`)
      .join(', ');

    return srcset || undefined;
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
      }}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-gray-700 animate-pulse"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Optimized Image */}
      <motion.img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={lazy && !priority ? "lazy" : "eager"}
        decoding={priority ? "sync" : "async"}
        srcSet={generateSrcSet()}
        sizes={width ? `(max-width: ${width}px) 100vw, ${width}px` : undefined}
        className={`w-full h-full transition-opacity duration-300 ${
          objectFit === "cover" ? "object-cover" :
          objectFit === "contain" ? "object-contain" :
          objectFit === "fill" ? "object-fill" :
          objectFit === "scale-down" ? "object-scale-down" :
          "object-none"
        }`}
        style={{
          opacity: isLoading ? 0 : 1,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        {...props}
      />

      {/* Error indicator (optional - can be removed in production) */}
      {hasError && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          Error
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
