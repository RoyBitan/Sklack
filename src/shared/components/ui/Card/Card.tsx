import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/shared/utils/cn";

const cardVariants = cva(
  "rounded-[2rem] transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-white border-2 border-gray-100",
        flat: "bg-gray-50",
        glass: "bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl",
        premium:
          "bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-50",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-8",
        lg: "p-12",
      },
      interactive: {
        true:
          "hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      interactive: false,
    },
  },
);

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = ({
  className,
  variant,
  padding,
  interactive,
  children,
  ...props
}: CardProps) => {
  return (
    <div
      className={cn(cardVariants({ variant, padding, interactive, className }))}
      {...props}
    >
      {children}
    </div>
  );
};
