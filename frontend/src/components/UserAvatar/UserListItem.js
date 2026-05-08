const UserListItem = ({user, handleFunction }) => {


  return (
    <div
      onClick={handleFunction}
      className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-gray-200 cursor-pointer hover:bg-teal-500 hover:text-white"
    >
      <img
        src={user.pic || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name)}
        alt={user.name}
        className="h-8 w-8 rounded-full object-cover"
      />
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs">
          <b>Email : </b>
          {user.email}
        </p>
      </div>
    </div>
  );
};

export default UserListItem;