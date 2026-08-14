import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

/* Pills everywhere -- no sharp corners in the system. */
const FIELD_CLASSES =
  "rounded-full border border-border-strong bg-surface px-5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-faint-foreground focus:border-info";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...props }, ref) {
    return <select ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />;
  }
);
