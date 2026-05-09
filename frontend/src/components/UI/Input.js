import React, { forwardRef } from "react";
import { motion } from "framer-motion";

const Input = forwardRef(
  (
    {
      type = "text",
      placeholder = "",
      value,
      onChange,
      onFocus,
      onBlur,
      disabled = false,
      icon: Icon,
      variant = "default",
      size = "md",
      error,
      helperText,
      className = "",
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const variantClasses = {
      default: "input-base",
      glass: "input-glass",
    };

    const sizeClasses = {
      sm: "text-sm px-3 py-1.5",
      md: "text-base px-4 py-2.5",
      lg: "text-lg px-4 py-3",
    };

    return (
      <div className="w-full">
        <div
          className={`relative flex items-center ${isFocused ? "scale-105" : ""} transition-transform duration-fast`}
        >
          {Icon && (
            <Icon className="absolute left-3 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          )}
          <motion.input
            ref={ref}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            disabled={disabled}
            className={`
              ${variantClasses[variant]}
              ${sizeClasses[size]}
              ${Icon ? "pl-10" : ""}
              ${error ? "border-red-500 focus:ring-red-500" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
