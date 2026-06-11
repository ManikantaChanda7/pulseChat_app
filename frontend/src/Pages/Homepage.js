import { useState } from "react";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function Homepage() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-100">
      <div className="w-full h-screen grid lg:grid-cols-[1fr_1fr] overflow-hidden bg-white">
        <div className="hidden lg:flex flex-col justify-center px-16 py-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-5xl xl:text-6xl font-black tracking-tight mb-4">
              Talk-A-Tive
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed max-w-md">
              Connect instantly with friends, share moments, and enjoy real-time
              conversations.
            </p>

            <div className="mt-8 space-y-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-sm">
                ⚡ Real-time messaging
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-sm">
                🔒 Secure conversations
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-sm">
                🌎 Stay connected anywhere
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 lg:px-10 py-4 flex flex-col justify-center overflow-y-auto bg-white">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-slate-900">Talk-A-Tive</h1>
            <p className="text-slate-500 mt-2">Real-time conversations</p>
          </div>

          <div className="bg-slate-100 p-1 rounded-2xl flex mb-4 max-w-md mx-auto w-full">
            <button
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === "login" ? "bg-white shadow-md text-slate-900" : "text-slate-500"}`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === "signup" ? "bg-white shadow-md text-slate-900" : "text-slate-500"}`}
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {activeTab === "login" ? <Login /> : <Signup />}
        </div>
      </div>
    </div>
  );
}

export default Homepage;
