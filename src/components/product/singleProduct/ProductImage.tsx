import { useState, useEffect, useRef, TouchEvent } from "react";
import { Product1 } from "../../../pages";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { BsZoomIn } from "react-icons/bs";

interface ProductImageProps {
  productId?: string;
}

const ProductImage = ({ productId }: ProductImageProps) => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Touch handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Fetch images based on productId
  useEffect(() => {
    setLoading(true);
    setCurrentImageIndex(0);

    // future: API call to fetch product images
    const fetchImages = async () => {
      try {
        // API call
        // const response = await fetch(`/api/products/${productId}/images`);
        // const data = await response.json();

        const timer = setTimeout(() => {
          setImages([Product1, Product1, Product1, Product1]); // Example with duplicate images
          setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Error fetching product images:", error);
        setLoading(false);
      }
    };

    fetchImages();
  }, [productId]);

  const navigateToImage = (index: number) => {
    if (transitioning || images.length <= 1 || index === currentImageIndex)
      return;

    setTransitioning(true);
    setZoomed(false);

    // Apply transition
    if (slideContainerRef.current) {
      const direction = index > currentImageIndex ? "next" : "prev";
      slideContainerRef.current.style.transition = "transform 300ms ease-out";
      slideContainerRef.current.style.transform =
        direction === "next" ? "translateX(-100%)" : "translateX(100%)";

      setTimeout(() => {
        setCurrentImageIndex(index);
        slideContainerRef.current!.style.transition = "none";
        slideContainerRef.current!.style.transform = "translateX(0)";
        setTransitioning(false);
      }, 300);
    }
  };

  const nextImage = () => {
    if (images.length <= 1) return;
    const nextIndex =
      currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
    navigateToImage(nextIndex);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    const prevIndex =
      currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    navigateToImage(prevIndex);
  };

  // Toggle zoom effect
  const toggleZoom = () => {
    if (transitioning) return;
    setZoomed(!zoomed);
  };

  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (zoomed) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (zoomed) return;
    touchEndX.current = e.touches[0].clientX;

    if (touchStartX.current && touchEndX.current && slideContainerRef.current) {
      const diffX = touchEndX.current - touchStartX.current;
      const threshold = 20;

      if (Math.abs(diffX) > threshold) {
        const translateX = Math.min(Math.max(-100, diffX / 3), 100);
        slideContainerRef.current.style.transform = `translateX(${translateX}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (zoomed) return;

    if (touchStartX.current && touchEndX.current) {
      const diffX = touchEndX.current - touchStartX.current;
      const threshold = 75;

      if (diffX > threshold) {
        prevImage();
      } else if (diffX < -threshold) {
        nextImage();
      } else if (slideContainerRef.current) {
        slideContainerRef.current.style.transition = "transform 200ms ease-out";
        slideContainerRef.current.style.transform = "translateX(0)";
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "Escape" && zoomed) {
        setZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex, images.length, zoomed]);

  return (
    <div className="w-full flex justify-center items-center pt-10 pb-6 sm:py-8 relative m-auto">
      {loading ? (
        <div className="w-[65%] sm:w-[50%] md:w-[40%] lg:w-[30%] xl:w-[100%] aspect-[1/2.5] bg-gray-700/30 animate-pulse rounded-lg"></div>
      ) : (
        <div className="relative w-[65%] sm:w-[50%] md:w-[40%] lg:w-[30%] xl:w-[100%] flex justify-center overflow-hidden rounded-lg">
          <div
            ref={slideContainerRef}
            className={`w-full h-full touch-pan-y ${
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={toggleZoom}
          >
            <div
              className={`transition-transform duration-300 ${
                zoomed ? "scale-150" : "scale-100"
              }`}
            >
              <img
                ref={imageRef}
                src={images[currentImageIndex]}
                className="w-full object-contain transition-transform"
                alt={`Product Image ${currentImageIndex + 1}`}
                loading="lazy"
              />
            </div>
          </div>

          {/* Zoom indicator */}
          {!zoomed && (
            <button
              onClick={toggleZoom}
              className="absolute top-2 right-2 bg-black/30 rounded-full p-1.5 text-white hover:bg-black/50 transition-colors z-10"
              aria-label="Zoom image"
            >
              <BsZoomIn size={16} />
            </button>
          )}

          {/* Navigation arrows - only show if more than one image and not zoomed */}
          {images.length > 1 && !zoomed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                disabled={transitioning}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1.5 text-white hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                aria-label="Previous image"
              >
                <IoChevronBack size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                disabled={transitioning}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1.5 text-white hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                aria-label="Next image"
              >
                <IoChevronForward size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Indicator dots */}
      {!loading && images.length > 1 && (
        <div className="flex gap-2 absolute bottom-0 sm:bottom-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all ${
                index === currentImageIndex
                  ? "bg-white scale-110"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                navigateToImage(index);
              }}
              aria-label={`View image ${index + 1}`}
              disabled={transitioning}
            ></button>
          ))}
        </div>
      )}

      {/* Zoom instructions tooltip  */}
      {!loading && !zoomed && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs py-1 px-3 rounded-full opacity-0 animate-fadeInOut pointer-events-none">
          Tap to zoom
        </div>
      )}
    </div>
  );
};

export default ProductImage;
