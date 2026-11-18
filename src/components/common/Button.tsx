import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import { forwardRef } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
  path?: string;
  className?: string;
  img?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  /**
   * Opt-in look for form actions. Without it the button is styled entirely by
   * className, as every existing caller does.
   */
  variant?: "primary" | "secondary";
  /** Shows a spinner and disables the button while an action is in flight. */
  loading?: boolean;
  /** Read in place of the title while loading, e.g. "Saving…". */
  loadingTitle?: string;
}

// White on red-600 is 4.8:1; the brand #ff343f behind white text is only 3.6:1.
const VARIANTS = {
  primary:
    "w-full justify-center normal-case font-semibold text-white bg-red-600 hover:bg-red-700 py-3 px-4 rounded-xl disabled:bg-gray-600 disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#212428]",
  secondary:
    "justify-center normal-case font-medium text-white bg-[#292B30] hover:bg-[#3A3A3C] py-3 px-5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
} as const;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  (
    {
      title,
      icon,
      path,
      className,
      img,
      onClick,
      disabled = false,
      type = "button",
      iconPosition = "end",
      variant,
      loading = false,
      loadingTitle,
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const newClassName = twMerge(
      "flex whitespace-nowrap gap-1 text-sm font-bold items-center capitalize rounded-lg py-1.5 px-3 transition-all duration-300",
      variant && VARIANTS[variant],
      isDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90",
      variant && isDisabled && "disabled:opacity-100",
      className
    );

    const content = loading ? (
      <>
        <LoadingSpinner size="sm" />
        {loadingTitle ?? title}
      </>
    ) : (
      <>
        {icon && iconPosition === "start" && icon}
        {img && <img src={img} alt="" className="w-[18px] h-[18px]" />}
        {title}
        {icon && iconPosition === "end" && icon}
      </>
    );

    // Fixed animation properties with proper TypeScript types
    const buttonAnimation = {
      whileHover: isDisabled ? {} : { scale: 1.02 },
      whileTap: isDisabled ? {} : { scale: 0.98 },
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 17 
      },
    };

    if (path) {
      return (
        <motion.div {...buttonAnimation}>
          <Link
            to={path}
            className={newClassName}
            onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
            aria-disabled={isDisabled}
            ref={ref as React.Ref<HTMLAnchorElement>}
          >
            {content}
          </Link>
        </motion.div>
      );
    }

    return (
      <motion.button
        type={type}
        className={newClassName}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...buttonAnimation}
      >
        {content}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;