import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-xl hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-destructive/20",
        outline: "border-[1.5px] border-border bg-transparent hover:bg-secondary hover:border-primary/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent font-medium",
        link: "text-accent underline-offset-4 hover:underline font-medium",
        // SafeCity specific variants
        hero: "bg-primary text-primary-foreground hover:bg-primary/95 shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-500",
        emergency: "bg-[#c66b53] text-white hover:bg-[#b05a45] shadow-lg animate-pulse transition-all",
        trust: "bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 backdrop-blur-sm",
        premium: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-2xl hover:shadow-primary/40 hover:-translate-y-1",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-5",
        lg: "h-14 rounded-2xl px-8 text-base",
        xl: "h-16 rounded-[20px] px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
