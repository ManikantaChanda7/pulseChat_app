import React from "react";

export default function ChatLoading() {
  const isDark = localStorage.getItem("darkMode") === "true";

  return (
    <div className="flex flex-col gap-4 mt-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center gap-4 px-2 py-4 rounded-[22px] animate-pulse ${
            isDark ? "bg-white/[0.03]" : "bg-[#f7f8fc]"
          }`}
        >
          {/* avatar */}
          <div
            className={`w-12 h-12 rounded-full shrink-0 ${
              isDark ? "bg-white/[0.08]" : "bg-[#e6eaf5]"
            }`}
          />

          {/* content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div
                className={`h-4 rounded-full w-[45%] ${
                  isDark ? "bg-white/[0.08]" : "bg-[#dde3f2]"
                }`}
              />

              <div
                className={`h-5 w-5 rounded-full ${
                  isDark ? "bg-white/[0.08]" : "bg-[#dde3f2]"
                }`}
              />
            </div>

            <div
              className={`h-3 rounded-full w-[70%] ${
                isDark ? "bg-white/[0.06]" : "bg-[#e8edf8]"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}