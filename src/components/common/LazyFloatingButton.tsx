import { FC, ReactNode, lazy, Suspense } from "react";
import { motion } from "framer-motion";

const FloatingActionButton = lazy(() => import("./FloatingActionButton"));

interface LazyFloatingButtonProps {
  icon: ReactNode;
  to: string;
  label?: string;
  position?: "bottom-right" | "bottom-center";
  color?: "primary" | "secondary";
}

// Loading placeholder
const ButtonPlaceholder: FC = () => (
  <motion.div
    className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#292B30]"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 1.5 }}
  />
);

const LazyFloatingButton: FC<LazyFloatingButtonProps> = (props) => {
  return (
    <Suspense fallback={<ButtonPlaceholder />}>
      <FloatingActionButton {...props} />
    </Suspense>
  );
};

export default LazyFloatingButton;
