import React from "react";
import { useHistory } from "react-router-dom";
import { ArrowLeft, Mail, User, Shield } from "lucide-react";

const ProfilePage = () => {
  const history = useHistory();
  const isDark = localStorage.getItem("darkMode") === "true";
  let userInfo = {};

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  } catch (error) {
    userInfo = {};
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
        isDark ? "bg-grey/60" : "bg-grey/10"
      }`}
    >
      <div
        className={`w-full max-w-4xl rounded-[36px] p-10 max-h-[90vh] overflow-auto shadow-2xl ${
          isDark
            ? "bg-[#0f172a] border border-white/10 text-white"
            : "bg-white border border-[#e8ecf8] text-[#2d3142]"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold">Profile</h1>

          <button
            onClick={() => history.goBack()}
            className={`flex items-center gap-2 px-5 py-3 rounded-[18px] transition ${
              isDark
                ? "bg-white/[0.05] hover:bg-white/[0.08]"
                : "bg-[#f5f7ff] hover:bg-[#eef2ff]"
            }`}
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Close</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="relative">
            <img
              src={
                userInfo.pic ||
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=300"
              }
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-[#2453c4] shadow-2xl"
            />
            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-[#32d26e] border-4 border-white" />
          </div>

          <div className="flex-1 w-full">
            <h2 className="text-[36px] font-bold mb-2 text-center md:text-left">
              {userInfo.name || "User"}
            </h2>

            <p
              className={`text-[16px] mb-8 text-center md:text-left ${
                isDark ? "text-[#94a3b8]" : "text-[#6b7280]"
              }`}
            >
              Manage your profile details and account information.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div
                className={`rounded-[24px] p-6 ${
                  isDark ? "bg-white/[0.04]" : "bg-[#f8f9fd]"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <User className="text-[#2453c4]" size={20} />
                  <span className="font-semibold">Full Name</span>
                </div>
                <p className="text-[16px]">
                  {userInfo.name || "Not available"}
                </p>
              </div>

              <div
                className={`rounded-[24px] p-6 ${
                  isDark ? "bg-white/[0.04]" : "bg-[#f8f9fd]"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="text-[#2453c4]" size={20} />
                  <span className="font-semibold">Email Address</span>
                </div>
                <p className="text-[16px] break-all">
                  {userInfo.email || "Not available"}
                </p>
              </div>

              <div
                className={`rounded-[24px] p-6 md:col-span-2 ${
                  isDark ? "bg-white/[0.04]" : "bg-[#f8f9fd]"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="text-[#2453c4]" size={20} />
                  <span className="font-semibold">Account Status</span>
                </div>
                <p className="text-[16px]">
                  Active account - your profile is available for chats and groups.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
