import { useEffect, useState } from "react";
import { useHistory } from "react-router";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function Homepage() {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    // if (user) history.push("/chats");
  }, [history]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-100">
      <div className="bg-white w-full max-w-xl mt-10 mb-4 p-4 rounded-lg border text-center">
        <h1 className="text-4xl font-semibold">Talk-A-Tive</h1>
      </div>

      <div className="bg-white w-full max-w-xl p-4 rounded-lg border">
        <div className="flex mb-4">
          <button
            className={`flex-1 py-2 rounded-l-lg ${activeTab === "login" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-r-lg ${activeTab === "signup" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("signup")}
          >
            Sign Up
          </button>
        </div>

        {activeTab === "login" ? <Login /> : <Signup />}
      </div>
    </div>
  );
}

export default Homepage;