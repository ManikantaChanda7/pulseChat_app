import { useState } from "react";
import ChatBox from "../components/ChatBox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { ChatState } from "../Context/ChatProvider";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const { user } = ChatState();

  return (
    <div className="h-screen w-full overflow-hidden bg-[#dfe5f2] p-5 md:p-6">
      {user && <SideDrawer />}

      <div className="mx-auto flex h-full w-full max-w-[1700px] gap-4 rounded-[38px] bg-[#2d5bdb] p-4 shadow-[0_25px_80px_rgba(37,99,235,0.22)]">
        {/* Left sidebar */}
        <div className="hidden lg:flex w-[340px] min-w-[340px] overflow-hidden rounded-[34px] bg-[#f4f5fb] shadow-inner">
          {user && <MyChats fetchAgain={fetchAgain} />}
        </div>

        {/* Main chat area */}
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-[34px] bg-[#f4f5fb] shadow-inner">
          {user && (
            <ChatBox
              fetchAgain={fetchAgain}
              setFetchAgain={setFetchAgain}
            />
          )}
        </div>

        {/* Right info panel placeholder */}
        <div className="hidden xl:flex w-[320px] min-w-[320px] flex-col rounded-[34px] bg-[#f4f5fb] p-6 shadow-inner">
          <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-slate-300 text-center text-sm font-medium text-slate-400">
            Chat info panel
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatpage;