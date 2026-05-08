const UserBadgeItem = ({ user, handleFunction, admin }) => {
  return (
    <div
      onClick={handleFunction}
      className="flex items-center gap-2 px-2 py-1 m-1 mb-2 text-sm bg-purple-500 text-white rounded-lg cursor-pointer hover:bg-purple-600"
    >
      <span>{user.name}</span>
      {admin === user._id && (
        <span className="text-xs font-semibold">(Admin)</span>
      )}
      <span className="text-xs">✕</span>
    </div>
  );
};

export default UserBadgeItem;