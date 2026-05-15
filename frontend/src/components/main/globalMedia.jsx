import React, { useEffect, useState } from "react";
import API from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { decryptMessageObject } from "../../utils/encryption";
import LeftSidebar from "./sideBar";
import { useHistory } from "react-router-dom";

export default function GlobalMedia() {
  const { user } = ChatState();
  const history = useHistory();
  const isDark = localStorage.getItem("darkMode") === "true";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchSharedMedia = async () => {
    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.get("/api/message/shared-files", config);

      setItems((data || []).map((msg) => decryptMessageObject(msg)));
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchSharedMedia();
    }
  }, [user?.token]);

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "images") return item.messageType === "image";
    if (filter === "files") return item.messageType === "file";
    if (filter === "voice") return item.messageType === "voice";
    return true;
  });

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
          className={`flex-[1_1_0%] min-w-0 rounded-[34px] p-8 overflow-y-auto custom-scrollbar ml-5 transition-colors ${
            isDark ? "bg-[#111827]" : "bg-[#eef0fb]"
          }`}
        >
          <div className="mb-8">
            <h1
              className={`text-[30px] font-bold ${
                isDark ? "text-white" : "text-[#2d3142]"
              }`}
            >
              Shared Media & Files
            </h1>

            <p
              className={`${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"} mt-2`}
            >
              All shared content across your chats
            </p>
          </div>

          <div className="flex gap-3 mb-8">
            {[
              ["all", "All"],
              ["images", "Images"],
              ["files", "Files"],
              ["voice", "Voice"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-full text-[14px] font-medium transition-colors ${
                  filter === key
                    ? isDark
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#2453c4] text-white"
                    : isDark
                      ? "bg-[#1f2937] text-[#d1d5db]"
                      : "bg-white text-[#2d3142]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}>
              Loading shared media...
            </p>
          ) : filteredItems.length ? (
            <div
              className="grid gap-5 w-full"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {filteredItems.map((item) => (
                <button
                  key={item._id}
                  onClick={() => window.open(item.content, "_blank")}
                  className={`rounded-[24px] p-4 text-left transition-colors ${
                    isDark
                      ? "bg-[#1f2937]"
                      : "bg-white shadow-[0_10px_25px_rgba(79,85,150,0.06)]"
                  }`}
                >
                  {item.messageType === "image" ? (
                    <img
                      src={item.content}
                      alt="Shared media"
                      className="w-full h-[180px] rounded-[18px] object-cover mb-4"
                    />
                  ) : (
                    <div
                      className={`w-full h-[180px] rounded-[18px] flex items-center justify-center text-[58px] mb-4 ${
                        isDark ? "bg-[#111827]" : "bg-[#f6f8fd]"
                      }`}
                    >
                      {item.messageType === "voice" ? "🎙️" : "📄"}
                    </div>
                  )}

                  <p
                    className={`text-[14px] font-semibold truncate ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    {item.messageType === "image"
                      ? "Image"
                      : item.messageType === "voice"
                        ? "Voice Message"
                        : item.fileName || "Document"}
                  </p>

                  <p
                    className={`text-[12px] mt-1 truncate ${
                      isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                    }`}
                  >
                    {item.chat?.chatName || "Direct Chat"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}>
              No shared content found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
