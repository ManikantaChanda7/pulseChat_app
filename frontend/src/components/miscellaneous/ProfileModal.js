import { useState } from "react";

const ProfileModal = ({ user, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <button onClick={onOpen} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">👁</button>
      )}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg w-[90%] md:w-[400px] p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-center w-full">{user.name}</h2>
              <button onClick={onClose} className="text-gray-500">✕</button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <img
                src={user.pic || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name)}
                alt={user.name}
                className="h-36 w-36 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name);
                }}
              />
              <p className="text-lg">Email: {user.email}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileModal;