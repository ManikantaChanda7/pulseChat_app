import React from "react";
import { motion } from "framer-motion";

const Avatar = ({
  src,
  alt = "User",
  size = "md",
  isOnline,
  status = "offline",
  className = "",
  badge,
}) => {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-20 h-20",
  };

  const statusColors = {
    online: "bg-accent-500",
    away: "bg-yellow-500",
    offline: "bg-slate-400",
    invisible: "bg-slate-300",
  };

  const statusSize = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
    "2xl": "w-5 h-5",
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full bg-gradient-to-br from-accent-400 to-accent-600 
          flex items-center justify-center overflow-hidden 
          border-2 border-white dark:border-slate-800
          shadow-md
        `}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-semibold text-xs">
            {alt.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Status Indicator */}
      {isOnline !== undefined && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute bottom-0 right-0 
            ${statusSize[size]}
            rounded-full border-2 border-white dark:border-slate-800
            ${statusColors[status]}
            ${isOnline && "animate-pulse-soft"}
          `}
        />
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white dark:border-slate-800">
          {badge}
        </div>
      )}
    </div>
  );
};

export default Avatar;
