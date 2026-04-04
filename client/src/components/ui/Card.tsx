import { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const variantStyles = {
  default:  "bg-background-card border border-cream/10",
  glass:    "bg-olive/40 backdrop-blur-sm border border-cream/10",
  elevated: "bg-background-surface border border-cream/10 shadow-xl shadow-black/40",
  bordered: "bg-transparent border-2 border-cream/20",
};

const paddingStyles = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-7",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      hoverable = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-2xl",
            variantStyles[variant],
            paddingStyles[padding],
            hoverable &&
              "cursor-pointer transition-all duration-200 hover:border-cream/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30",
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={twMerge("text-lg font-display font-bold text-cream", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("text-cream/80", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        "flex items-center justify-end gap-3 mt-4 pt-4 border-t border-cream/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
