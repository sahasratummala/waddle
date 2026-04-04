import { useEffect, useRef, HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-full m-4",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true,
  children,
  footer,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleBackdropClick(e: React.MouseEvent) {
    if (closeOnBackdrop && e.target === overlayRef.current) {
      onClose();
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className={twMerge(
          clsx(
            "relative w-full bg-background-light border border-white/10 rounded-2xl",
            "shadow-2xl shadow-black/50",
            "animate-in",
            sizeStyles[size],
            className
          )
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-display font-bold text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-white/60">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Convenience sub-exports
export function ModalActions({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge("flex items-center justify-end gap-3 mt-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
