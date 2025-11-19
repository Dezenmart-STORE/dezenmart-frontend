import { motion } from "framer-motion";

const Loadscreen = () => {
  // Calculate circumferences for stroke animation
  const redCircleCircumference = 2 * Math.PI * 75;
  const whiteCircleCircumference = 2 * Math.PI * 75;
  const smallWhiteCircumference = 2 * Math.PI * 50;
  const smallRedCircumference = 2 * Math.PI * 50;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#212428] flex flex-col items-center justify-center z-[9999] overflow-hidden">
      {/* Minimal gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#212428] via-[#1a1c20] to-[#212428]" />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-md w-full">
        {/* Animated Logo with drawing animation */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 400"
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 1, 0] }}
            transition={{
              duration: 4.5,
              times: [0, 0.05, 0.9, 0.95, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <defs>
              <clipPath id="clip-top-left">
                <rect x="0" y="0" width="207" height="207" />
              </clipPath>
              <clipPath id="clip-bottom-right">
                <rect x="203" y="203" width="207" height="207" />
              </clipPath>
            </defs>

            {/* 🔴 TOP-LEFT TEARDROP - Red Circle Fill */}
            <g clipPath="url(#clip-top-left)">
              <motion.circle
                cx="135"
                cy="135"
                r="75"
                fill="#FF3B30"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 1, 0] }}
                transition={{
                  duration: 4.5,
                  times: [0, 0.27, 0.4, 0.9, 0.95, 1],
                  repeat: Infinity,
                  ease: "easeIn",
                }}
              />
            </g>

            {/* Red Circle Stroke */}
            <g clipPath="url(#clip-top-left)">
              <motion.circle
                cx="135"
                cy="135"
                r="75"
                fill="none"
                stroke="#FF3B30"
                strokeWidth="3"
                initial={{
                  pathLength: 0,
                  opacity: 1,
                }}
                animate={{
                  pathLength: [0, 1, 1, 1, 0],
                  opacity: [1, 1, 0, 0, 0],
                }}
                transition={{
                  duration: 4.5,
                  times: [0, 0.27, 0.4, 0.9, 1],
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                style={{
                  strokeDasharray: redCircleCircumference,
                }}
              />
            </g>

            {/* White Triangle Fill */}
            <motion.polygon
              points="205,205 150,207.1 207.1,150"
              fill="#FFFFFF"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 1, 1, 1, 0] }}
              transition={{
                duration: 4.5,
                times: [0, 0.27, 0.4, 0.9, 0.95, 1],
                repeat: Infinity,
                ease: "easeIn",
              }}
            />

            {/* White Triangle Stroke */}
            <motion.polygon
              points="205,205 150,207.1 207.1,150"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{
                pathLength: [0, 1, 1, 1, 0],
                opacity: [1, 1, 0, 0, 0],
              }}
              transition={{
                duration: 4.5,
                times: [0, 0.27, 0.4, 0.9, 1],
                repeat: Infinity,
                ease: "easeOut",
              }}
            />

            {/* ⚪ BOTTOM-RIGHT TEARDROP - White Circle Fill */}
            <g clipPath="url(#clip-bottom-right)">
              <motion.circle
                cx="275"
                cy="275"
                r="75"
                fill="#FFFFFF"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0, 1, 1, 1, 0] }}
                transition={{
                  duration: 4.5,
                  times: [0, 0.18, 0.45, 0.58, 0.9, 0.95, 1],
                  repeat: Infinity,
                  ease: "easeIn",
                }}
              />
            </g>

            {/* White Circle Stroke */}
            <g clipPath="url(#clip-bottom-right)">
              <motion.circle
                cx="275"
                cy="275"
                r="75"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{
                  pathLength: [0, 0, 1, 1, 1, 0],
                  opacity: [0, 1, 1, 0, 0, 0],
                }}
                transition={{
                  duration: 4.5,
                  times: [0, 0.18, 0.45, 0.58, 0.9, 1],
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                style={{
                  strokeDasharray: whiteCircleCircumference,
                }}
              />
            </g>

            {/* Red Triangle Fill */}
            <motion.polygon
              points="205,205 260,202.9 202.9,253"
              fill="#FF3B30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 1, 1, 1, 0] }}
              transition={{
                duration: 4.5,
                times: [0, 0.18, 0.45, 0.58, 0.9, 0.95, 1],
                repeat: Infinity,
                ease: "easeIn",
              }}
            />

            {/* Red Triangle Stroke */}
            <motion.polygon
              points="205,205 260,202.9 202.9,253"
              fill="none"
              stroke="#FF3B30"
              strokeWidth="3"
              strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{
                pathLength: [0, 0, 1, 1, 1, 0],
                opacity: [0, 1, 1, 0, 0, 0],
              }}
              transition={{
                duration: 4.5,
                times: [0, 0.18, 0.45, 0.58, 0.9, 1],
                repeat: Infinity,
                ease: "easeOut",
              }}
            />

            {/* Small white circle (top-right) Fill */}
            <motion.circle
              cx="270"
              cy="140"
              r="50"
              fill="#FFFFFF"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 0, 1, 1, 1, 0] }}
              transition={{
                duration: 4.5,
                times: [0, 0.36, 0.53, 0.63, 0.75, 0.9, 0.95, 1],
                repeat: Infinity,
                ease: "easeIn",
              }}
            />

            {/* Small white circle Stroke */}
            <motion.circle
              cx="270"
              cy="140"
              r="50"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{
                pathLength: [0, 0, 0, 1, 1, 1, 0],
                opacity: [0, 0, 1, 1, 0, 0, 0],
              }}
              transition={{
                duration: 4.5,
                times: [0, 0.36, 0.53, 0.63, 0.75, 0.9, 1],
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{
                strokeDasharray: smallWhiteCircumference,
              }}
            />

            {/* Small red circle (bottom-left) Fill */}
            <motion.circle
              cx="140"
              cy="270"
              r="50"
              fill="#FF3B30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 1, 0] }}
              transition={{
                duration: 4.5,
                times: [0, 0.44, 0.58, 0.67, 0.78, 0.88, 0.9, 0.95, 1],
                repeat: Infinity,
                ease: "easeIn",
              }}
            />

            {/* Small red circle Stroke */}
            <motion.circle
              cx="140"
              cy="270"
              r="50"
              fill="none"
              stroke="#FF3B30"
              strokeWidth="3"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{
                pathLength: [0, 0, 0, 0, 1, 1, 1, 0],
                opacity: [0, 0, 0, 1, 1, 0, 0, 0],
              }}
              transition={{
                duration: 4.5,
                times: [0, 0.44, 0.58, 0.67, 0.78, 0.88, 0.9, 1],
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{
                strokeDasharray: smallRedCircumference,
              }}
            />
          </motion.svg>
        </motion.div>

        {/* DEZENMART text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center tracking-wider">
            DEZENMART
          </h1>
        </motion.div>
      </div>
    </div>
  );
};

export default Loadscreen;
