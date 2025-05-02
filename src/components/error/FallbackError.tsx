import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BiErrorAlt } from "react-icons/bi";
import Container from "../common/Container";

interface FallbackErrorProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

const FallbackError = memo(({ resetErrorBoundary }: FallbackErrorProps) => {
  return (
    <div className="bg-Dark min-h-screen flex items-center justify-center">
      <Container className="py-10 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <BiErrorAlt className="text-Red text-8xl md:text-9xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white text-xl md:text-3xl font-bold mb-4"
          >
            Unexpected Application Error
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#C6C6C8] text-sm md:text-base mb-8 max-w-md mx-auto"
          >
            We've encountered an error and our team has been notified. Please
            try refreshing the page or navigate back to the home page.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button
              onClick={() =>
                resetErrorBoundary
                  ? resetErrorBoundary()
                  : window.location.reload()
              }
              className="bg-[#292B30] text-white px-6 py-3 rounded-md hover:bg-[#33363b] transition-all"
            >
              Refresh Page
            </button>

            <Link
              to="/"
              className="bg-Red text-white px-6 py-3 rounded-md hover:bg-opacity-90 transition-all"
            >
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
});

export default FallbackError;
