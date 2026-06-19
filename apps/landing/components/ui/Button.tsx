"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium font-body transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-violet/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-violet text-white hover:bg-brand-violet/90 shadow-lg shadow-brand-violet/25",
        secondary:
          "bg-brand-teal text-white hover:bg-brand-teal/90 shadow-lg shadow-brand-teal/25",
        outline:
          "border-2 border-brand-violet text-brand-violet hover:bg-brand-violet hover:text-white",
        ghost: "text-brand-violet hover:bg-brand-violet/10",
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
