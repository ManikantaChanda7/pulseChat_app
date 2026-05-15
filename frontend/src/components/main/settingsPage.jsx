import React, { useEffect, useState } from "react";
import LeftSidebar from "./sideBar";
import { ChatState } from "../../Context/ChatProvider";
import API from "../../config/api";

export default function SettingsPage() {
  const { user, setUser, setOnlineUsers, setLastSeenMap } = ChatState();

  const persistedUser = JSON.parse(localStorage.getItem("userInfo") || "{}");

  const [profileForm, setProfileForm] = useState({
    name: user?.name || persistedUser?.name || "",
    email: user?.email || persistedUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    bio:
      localStorage.getItem("profileBio") ||
      persistedUser?.bio ||
      "Building conversations ✨",
  });

  const [notifications, setNotifications] = useState({
    sounds: true,
    desktop: true,
    reactions: true,
    mentions: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    readReceipts: user?.privacy?.readReceipts !== false,
    showLastSeen: user?.privacy?.showLastSeen !== false,
  });

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true",
  );

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("profileBio", profileForm.bio);
  }, [profileForm.bio]);

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const savePrivacySetting = async (key, value) => {
    try {
      const token = user?.token || persistedUser?.token;

      if (!token) {
        console.error("No auth token found for privacy settings update");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const updatedPrivacy = {
        ...privacySettings,
        [key]: value,
      };

      await API.put("/api/user/privacy", updatedPrivacy, config);

      const updatedUser = {
        ...(user || persistedUser),
        privacy: updatedPrivacy,
      };

      setPrivacySettings(updatedPrivacy);
      setUser(updatedUser);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));

      if (key === "showLastSeen" && value === false) {
        setOnlineUsers([]);
        setLastSeenMap({});
      }
    } catch (error) {
      console.error("PRIVACY SETTINGS UPDATE ERROR", error);
    }
  };

  const isDark = darkMode;

  const Toggle = ({ enabled, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-14 h-8 rounded-full transition-all relative cursor-pointer shrink-0 z-10 pointer-events-auto ${
        enabled ? "bg-[#2563eb]" : isDark ? "bg-[#374151]" : "bg-[#d8dced]"
      }`}
    >
      <div
        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all pointer-events-none ${
          enabled ? "right-1" : "left-1"
        }`}
      />
    </button>
  );

  return (
    <div
      className={`h-screen w-screen p-4 overflow-hidden ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#0b1020_45%,#050814_100%)]"
          : "bg-[#dfe3ee]"
      }`}
    >
      <div
        className={`w-full h-full rounded-[44px] p-[14px] flex gap-[14px] overflow-hidden ${
          isDark
            ? "bg-black/30 backdrop-blur-2xl border border-white/10"
            : "bg-[#2453c4]"
        }`}
      >
        <LeftSidebar />

        <div
          className={`flex-[1_1_0%] min-w-0 rounded-[34px] p-8 ml-5 overflow-y-auto custom-scrollbar transition-colors ${
            isDark ? "bg-[#111827]" : "bg-[#eef0fb]"
          }`}
        >
          <div className="mb-10">
            <h1
              className={`${isDark ? "text-white" : "text-[#2d3142]"} text-[30px] font-bold`}
            >
              Settings
            </h1>
            <p
              className={`${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"} mt-2`}
            >
              Manage your account and preferences
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* PROFILE SETTINGS */}
            <div
              className={`${isDark ? "bg-[#1f2937]" : "bg-white"} rounded-[28px] p-6 transition-colors col-span-2`}
            >
              <h2
                className={`${isDark ? "text-white" : "text-[#2d3142]"} text-[18px] font-semibold mb-6`}
              >
                Profile Settings
              </h2>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex flex-col items-center min-w-[220px]">
                  <img
                    src={
                      user?.pic ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(user?.name || "User")
                    }
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover mb-4"
                  />

                  <button className="px-5 py-3 bg-[#2453c4] text-white rounded-[16px]">
                    Change Photo
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      Full Name
                    </label>
                    <input
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div>
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      Email Address
                    </label>
                    <input
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      Bio / Status
                    </label>
                    <input
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div>
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div>
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"} text-sm block mb-2`}
                    >
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className={`${isDark ? "bg-[#111827] text-white border-white/10" : "bg-[#f8f9fd] text-[#2d3142] border-[#e5e7eb]"} w-full px-4 py-3 rounded-[16px] border outline-none`}
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                    <button
                      className={`${isDark ? "bg-[#111827] text-white" : "bg-[#f3f4f6] text-[#2d3142]"} px-5 py-3 rounded-[16px]`}
                    >
                      Cancel
                    </button>
                    <button className="px-6 py-3 bg-[#2453c4] text-white rounded-[16px]">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* APPEARANCE */}
            <div
              className={`${isDark ? "bg-[#1f2937]" : "bg-white"} rounded-[28px] p-6 transition-colors`}
            >
              <h2
                className={`${isDark ? "text-white" : "text-[#2d3142]"} text-[18px] font-semibold mb-6`}
              >
                Chat Settings
              </h2>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`${isDark ? "text-white" : "text-[#2d3142]"} font-medium`}
                    >
                      Dark Mode
                    </p>
                    <p
                      className={`${isDark ? "text-[#9ca3af]" : "text-[13px] text-[#7b8197]"} mt-1`}
                    >
                      Switch between dark and light chat themes
                    </p>
                  </div>

                  <Toggle
                    enabled={darkMode}
                    onClick={() => setDarkMode((prev) => !prev)}
                  />
                </div>
              </div>
            </div>

            {/* PRIVACY */}
            <div
              className={`${isDark ? "bg-[#1f2937]" : "bg-white"} rounded-[28px] p-6 transition-colors`}
            >
              <h2
                className={`${isDark ? "text-white" : "text-[#2d3142]"} text-[18px] font-semibold mb-6`}
              >
                Privacy
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between ${isDark ? "bg-[#111827]" : "bg-[#f6f8fd]"} w-full px-5 py-4 rounded-[18px]`}
                >
                  <div>
                    <p
                      className={`${isDark ? "text-white" : "text-[#2d3142]"} font-medium`}
                    >
                      Read Receipts
                    </p>
                    <p
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"} text-[12px] mt-1`}
                    >
                      Show message read status to others
                    </p>
                  </div>
                  <Toggle
                    enabled={privacySettings.readReceipts}
                    onClick={() =>
                      savePrivacySetting(
                        "readReceipts",
                        !privacySettings.readReceipts,
                      )
                    }
                  />
                </div>

                <div
                  className={`flex items-center justify-between ${isDark ? "bg-[#111827]" : "bg-[#f6f8fd]"} w-full px-5 py-4 rounded-[18px]`}
                >
                  <div>
                    <p
                      className={`${isDark ? "text-white" : "text-[#2d3142]"} font-medium`}
                    >
                      Last Seen Visibility
                    </p>
                    <p
                      className={`${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"} text-[12px] mt-1`}
                    >
                      Hide online and last seen presence for everyone
                    </p>
                  </div>
                  <Toggle
                    enabled={privacySettings.showLastSeen}
                    onClick={() =>
                      savePrivacySetting(
                        "showLastSeen",
                        !privacySettings.showLastSeen,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
