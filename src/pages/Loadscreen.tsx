import { LogoSVG } from ".";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Loadscreen = () => {
  const [progress, setProgress] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#212428] flex flex-col items-center justify-center z-[9999] overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#212428] via-[#1a1c20] to-[#2a1820]"
        animate={{
          background: [
            "linear-gradient(135deg, #212428 0%, #1a1c20 50%, #2a1820 100%)",
            "linear-gradient(135deg, #2a1820 0%, #212428 50%, #1a1c20 100%)",
            "linear-gradient(135deg, #1a1c20 0%, #2a1820 50%, #212428 100%)",
            "linear-gradient(135deg, #212428 0%, #1a1c20 50%, #2a1820 100%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(239, 68, 68, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239, 68, 68, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Floating particles with improved animation */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              background: `rgba(239, 68, 68, ${Math.random() * 0.3 + 0.1})`,
            }}
            initial={{
              x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
              y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
            }}
            animate={{
              x: typeof window !== 'undefined' ? [null, Math.random() * window.innerWidth] : [0, 100],
              y: typeof window !== 'undefined' ? [null, Math.random() * window.innerHeight] : [0, 100],
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-md w-full">
        {/* Animated glow effect behind logo */}
        <motion.div
          className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-Red/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Logo with advanced animations */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.8,
          }}
          className="relative mb-8 sm:mb-12"
        >
          {/* Rotating ring around logo */}
          <motion.div
            className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border-2 border-Red/30"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              },
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            style={{
              borderTopColor: "rgba(239, 68, 68, 0.8)",
              borderRightColor: "rgba(239, 68, 68, 0.4)",
              borderBottomColor: "rgba(239, 68, 68, 0.1)",
              borderLeftColor: "rgba(239, 68, 68, 0.6)",
            }}
          />

          {/* Pulsing circles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-Red/20"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{
                scale: [1, 2, 2.5],
                opacity: [0.8, 0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Logo SVG with morphing animation */}
          <motion.div
            className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.img
              src={LogoSVG}
              alt="DezenMart Logo"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-2xl"
              animate={{
                filter: [
                  "drop-shadow(0 0 20px rgba(239, 68, 68, 0.3))",
                  "drop-shadow(0 0 40px rgba(239, 68, 68, 0.6))",
                  "drop-shadow(0 0 20px rgba(239, 68, 68, 0.3))",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Brand name with letter animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-6"
        >
          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center tracking-wide">
            {"DezenMart".split("").map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + index * 0.05,
                  duration: 0.3,
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-gray-400 text-xs sm:text-sm text-center mt-2"
          >
            Your Web3 Marketplace
          </motion.p>
        </motion.div>

        {/* Enhanced progress bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-xs mb-6"
        >
          <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700/30">
            {/* Background shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Progress fill */}
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-Red via-red-500 to-Red rounded-full shadow-lg shadow-Red/50"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          {/* Progress percentage */}
          <motion.p
            className="text-Red text-xs text-center mt-2 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {Math.min(Math.round(progress), 100)}%
          </motion.p>
        </motion.div>

        {/* Loading dots animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex gap-2 mb-8"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-Red rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        {/* Feature tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {["Secure", "Decentralized", "Fast"].map((tag, index) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 1.2 + index * 0.1,
                type: "spring",
                stiffness: 200,
              }}
              className="px-3 py-1 bg-Red/10 border border-Red/30 rounded-full text-Red text-xs font-medium backdrop-blur-sm"
            >
              {tag}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Powered by text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-6 sm:bottom-8 text-center px-4"
      >
        <p className="text-gray-500 text-xs">
          Powered by Celo Blockchain
        </p>
      </motion.div>
    </div>
  );
};

export default Loadscreen;
