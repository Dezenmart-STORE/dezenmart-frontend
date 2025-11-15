import { Logo } from ".";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Loadscreen = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Preload the logo image
  useEffect(() => {
    const img = new Image();
    img.src = Logo;

    img.onload = () => {
      setImageLoaded(true);
    };

    img.onerror = () => {
      // Even if image fails to load, set as ready to prevent infinite loading
      console.warn("Failed to load logo image");
      setImageLoaded(true);
    };

    // Ensure minimum display time for smooth transition
    const timer = setTimeout(() => setIsReady(true), 300);

    return () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#212428] flex flex-col items-center justify-center z-[9999] overflow-hidden">
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#212428] via-[#1a1c20] to-[#212428] opacity-50" />

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-Red/20 rounded-full"
            initial={{
              x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
              y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
            }}
            animate={{
              y: typeof window !== 'undefined' ? [null, Math.random() * window.innerHeight] : [0, 100],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Logo with smooth animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: imageLoaded ? 1 : 0.8, opacity: imageLoaded ? 1 : 0 }}
          transition={{
            duration: 0.5,
            ease: [0.43, 0.13, 0.23, 0.96],
          }}
          className="relative"
        >
          {imageLoaded ? (
            <motion.img
              src={Logo}
              alt="DezenMart Logo"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-contain"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              loading="eager"
              decoding="async"
            />
          ) : (
            // Placeholder while image loads
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gray-700/30 rounded-lg animate-pulse" />
          )}
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 sm:mt-8 max-w-xs"
        >
          <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold text-center">
            DezenMart
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm text-center mt-1">
            Loading your Web3 marketplace...
          </p>
        </motion.div>

        {/* Modern loading bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 sm:mt-8 w-48 sm:w-64"
        >
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-Red via-red-400 to-Red rounded-full"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ width: "50%" }}
            />
          </div>
        </motion.div>

        {/* Spinning loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-4"
        >
          <div className="w-6 h-6 border-2 border-Red/30 border-t-Red rounded-full animate-spin" />
        </motion.div>
      </div>

      {/* Bottom decorative element */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-6 sm:bottom-8 text-center px-4"
      >
        <p className="text-gray-500 text-xs">
          Secure • Decentralized • Fast
        </p>
      </motion.div>
    </div>
  );
};

export default Loadscreen;
