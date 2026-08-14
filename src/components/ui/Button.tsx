import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "info" | "ghost" | "strava";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
}

/*
 * Yellow is the thing you act on; blue is information. That rule is what keeps
 * the two accents from competing, so `primary` is the only yellow variant and
 * there should never be two of them in one view -- reach for `secondary` for
 * the lesser action in a pair.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground font-bold hover:bg-accent-hover",
  secondary: "border border-border-strong text-foreground font-semibold hover:bg-[rgba(255,255,255,0.05)]",
  info: "border border-info text-info font-semibold hover:bg-[var(--fill-blue-soft)]",
  ghost: "text-faint-foreground font-semibold hover:text-foreground",
  strava: "bg-strava text-white font-bold hover:brightness-110",
};

const SIZE_CLASSES = {
  md: "px-6 py-3.5 text-[13px]",
  sm: "px-5 py-2.5 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`brand-label inline-flex items-center justify-center gap-2 rounded-full leading-none transition-colors disabled:pointer-events-none disabled:opacity-45 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
