import React from 'react'

const ChatLoading = () => {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-[45px] w-full bg-gray-300 rounded animate-pulse"
        />
      ))}
    </div>
  )
}

export default ChatLoading;
