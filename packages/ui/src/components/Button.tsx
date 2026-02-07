import { type ButtonHTMLAttributes, forwardRef } from 'react';

const variants = {
  primary:
    'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg',
  secondary:
    'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200',
  outline:
    'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
