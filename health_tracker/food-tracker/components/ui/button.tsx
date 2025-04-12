import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    // Generate appropriate class names based on variant and size
    const getVariantClass = () => {
      switch (variant) {
        case 'default':
          return 'bg-blue-600 text-white hover:bg-blue-700';
        case 'outline':
          return 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
        case 'ghost':
          return 'bg-transparent text-gray-700 hover:bg-gray-100';
        case 'link':
          return 'bg-transparent text-blue-600 underline-offset-4 hover:underline';
        case 'destructive':
          return 'bg-red-600 text-white hover:bg-red-700';
        default:
          return 'bg-blue-600 text-white hover:bg-blue-700';
      }
    };

    const getSizeClass = () => {
      switch (size) {
        case 'default':
          return 'h-10 px-4 py-2';
        case 'sm':
          return 'h-8 px-3 py-1 text-sm';
        case 'lg':
          return 'h-12 px-6 py-3 text-lg';
        case 'icon':
          return 'h-10 w-10 p-2';
        default:
          return 'h-10 px-4 py-2';
      }
    };

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none ${getVariantClass()} ${getSizeClass()} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button'; 