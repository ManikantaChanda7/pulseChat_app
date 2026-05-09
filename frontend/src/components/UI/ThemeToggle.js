import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { motion } from "framer-motion";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="btn-icon btn-secondary"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 180, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Sun className="w-5 h-5" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 180, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Moon className="w-5 h-5" />
        </motion.div>
      )}
    </motion.button>
  );
};

export default ThemeToggle;
