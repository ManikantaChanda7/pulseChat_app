import React from "react";
import { motion } from "framer-motion";

const Badge = ({
  children,
  variant = "default",
  size = "md",
  icon: Icon,
  onClose,
  className = "",
}) => {
  const variantClasses = {
    default: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
    primary:
      "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300",
    success:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    warning:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    danger: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    glass: "glass text-slate-900 dark:text-slate-50",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`
        inline-flex items-center gap-2 rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="ml-1 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </motion.div>
  );
};

export default Badge;
