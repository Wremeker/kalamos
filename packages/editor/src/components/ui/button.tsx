import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-gray-900 text-gray-50 shadow hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 rounded-md disabled:opacity-50',
        primary:
          'bg-[#31A2FF] text-white hover:bg-[#0086F4] disabled:bg-[#92CEFF] rounded-full shadow-sm',
        secondary:
          'bg-transparent text-[#31A2FF] border border-[#31A2FF] hover:text-[#0086F4] hover:border-[#0086F4] disabled:text-[#92CEFF] disabled:border-[#92CEFF] rounded-full',
        destructive:
          'bg-red-500 text-gray-50 shadow-sm hover:bg-red-500/90 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/90 rounded-md disabled:opacity-50',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50',
        ghost: 'hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50',
        link: 'text-foreground underline-offset-4 hover:underline disabled:opacity-50',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        md: 'h-[54px] px-6 text-lg tracking-[-0.54px]',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
