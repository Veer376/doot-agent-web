"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(({ className, label, type, id, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id || `floating-input-${generatedId}`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(e.target.value.length > 0);
    props.onChange?.(e);
  };

  // Check initial value
  React.useEffect(() => {
    if (props.value !== undefined && props.value !== "") {
      setHasValue(true);
    }
  }, [props.value]);

  const isFloating = isFocused || hasValue;

  return (
    <div className="relative w-full">
      <input
        type={type}
        id={inputId}
        ref={ref}
        data-slot="input"
        data-radius="radius2"
        className={cn(
          "peer file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-full border bg-transparent px-4 py-4 text-base shadow-xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        placeholder=" "
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "text-muted-foreground pointer-events-none absolute left-4 transition-all duration-200 ease-out",
          "bg-background px-1",
          isFloating
            ? "top-0 -translate-y-1/2 text-xs"
            : "top-1/2 -translate-y-1/2 text-sm",
          isFocused && "text-primary",
        )}
      >
        {label}
      </label>
    </div>
  );
});

FloatingLabelInput.displayName = "FloatingLabelInput";

interface FloatingLabelPasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const FloatingLabelPasswordInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelPasswordInputProps
>(({ className, label, id, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id || `floating-password-${generatedId}`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(e.target.value.length > 0);
    props.onChange?.(e);
  };

  // Check initial value
  React.useEffect(() => {
    if (props.value !== undefined && props.value !== "") {
      setHasValue(true);
    }
  }, [props.value]);

  const isFloating = isFocused || hasValue;

  return (
    <div className="relative w-full">
      <input
        type={showPassword ? "text" : "password"}
        id={inputId}
        ref={ref}
        data-slot="input"
        data-radius="radius2"
        className={cn(
          "peer hide-password-toggle file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-full border bg-transparent p-4 pr-12 text-base shadow-xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        placeholder=" "
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "text-muted-foreground pointer-events-none absolute left-4 transition-all duration-200 ease-out",
          "bg-background px-1",
          isFloating
            ? "top-0 -translate-y-1/2 text-xs"
            : "top-1/2 -translate-y-1/2 text-sm",
          isFocused && "text-primary",
        )}
      >
        {label}
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-transparent"
        onClick={() => setShowPassword((prev) => !prev)}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeIcon
            className="h-4 w-4"
            aria-hidden="true"
          />
        ) : (
          <EyeOffIcon
            className="h-4 w-4"
            aria-hidden="true"
          />
        )}
        <span className="sr-only">
          {showPassword ? "Hide password" : "Show password"}
        </span>
      </Button>

      {/* hides browsers password toggles */}
      <style>{`
        .hide-password-toggle::-ms-reveal,
        .hide-password-toggle::-ms-clear {
          visibility: hidden;
          pointer-events: none;
          display: none;
        }
      `}</style>
    </div>
  );
});

FloatingLabelPasswordInput.displayName = "FloatingLabelPasswordInput";
