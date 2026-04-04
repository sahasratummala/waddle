import { forwardRef, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-avocado text-cream font-semibold " +
    "hover:bg-primary-500 active:bg-primary-600 " +
    "shadow-lg shadow-avocado/20 hover:shadow-avocado/30",
  secondary:
    "bg-ocean text-forest font-semibold " +
    "hover:bg-secondary-400 active:bg-secondary-500 " +
    "shadow-lg shadow-ocean/20",
  ghost:
    "bg-transparent text-cream/80 hover:bg-cream/10 hover:text-cream active:bg-cream/15",
  danger:
    "bg-error text-cream font-semibold hover:bg-red-700 active:bg-red-800 " +
    "shadow-lg shadow-red-900/30",
  outline:
    "bg-transparent border border-cream/30 text-cream " +
    "hover:bg-cream/8 hover:border-cream/60 active:bg-cream/15",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center",
            "font-medium transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-avocado/50",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && "w-full",
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
