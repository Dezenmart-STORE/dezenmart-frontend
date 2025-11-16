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
      {/* Minimal gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#212428] via-[#1a1c20] to-[#212428]" />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-md w-full">
        {/* Animated Logo with minimalist motion graphics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-12"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 400"
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
          >
            <defs>
              <clipPath id="clip-top-left">
                <rect x="0" y="0" width="207" height="207" />
              </clipPath>
              <clipPath id="clip-bottom-right">
                <rect x="203" y="203" width="207" height="207" />
              </clipPath>
            </defs>

            {/* 🔴 TOP-LEFT TEARDROP (circle + triangle) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              <g clipPath="url(#clip-top-left)">
                <motion.circle
                  cx="135"
                  cy="135"
                  r="75"
                  fill="#FF3B30"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: "135px 135px" }}
                />
              </g>
              <motion.polygon
                points="205,205 260,202.9 202.9,253"
                fill="#000000"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.g>

            {/* ⚫ BOTTOM-RIGHT TEARDROP (circle + triangle) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.4,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              <g clipPath="url(#clip-bottom-right)">
                <motion.circle
                  cx="275"
                  cy="275"
                  r="75"
                  fill="#000000"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  style={{ transformOrigin: "275px 275px" }}
                />
              </g>
              <motion.polygon
                points="205,205 150,207.1 207.1,150"
                fill="#FF3B30"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />
            </motion.g>

            {/* Small black circle (top-right) */}
            <motion.circle
              cx="270"
              cy="140"
              r="50"
              fill="#000000"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.6,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              style={{ transformOrigin: "270px 140px" }}
            />

            {/* Small red circle (bottom-left) */}
            <motion.circle
              cx="140"
              cy="270"
              r="50"
              fill="#FF3B30"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.8,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              style={{ transformOrigin: "140px 270px" }}
            />
          </svg>

          {/* Subtle rotating ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-Red/20"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              },
              scale: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center tracking-wide">
            DezenMart
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-gray-400 text-xs sm:text-sm text-center mt-2"
          >
            Your Web3 Marketplace
          </motion.p>
        </motion.div>

        {/* Minimalist progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="w-full max-w-xs mb-6"
        >
          <div className="relative h-1 bg-gray-800/30 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-Red rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <motion.p
            className="text-gray-500 text-xs text-center mt-3 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            {Math.min(Math.round(progress), 100)}%
          </motion.p>
        </motion.div>

        {/* Minimal loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="flex gap-1.5"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-Red rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Powered by text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-8 text-center px-4"
      >
        <p className="text-gray-500 text-xs">Powered by Celo Blockchain</p>
      </motion.div>
    </div>
  );
};

export default Loadscreen;
