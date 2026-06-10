import { useState } from "react";
import API from "../../config/api";
import { useHistory } from "react-router-dom";
// import { ChatState } from "../../Context/ChatProvider";

const Login = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false);

  const history = useHistory();
//   const { setUser } = ChatState();

  const submitHandler = async () => {
    setLoading(true);
    if (!email || !password) {
      console.log("Please fill all fields");
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.post("/api/user/login", {
        email,
        password,
      });

      console.log("Login Successful");
      // setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setLoading(false);
      history.push("/chats");
    } catch (error) {
      console.error(error?.response?.data?.message || "Error Occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-3xl bg-blue-600 text-white text-2xl font-bold mb-4">
          💬
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
        <p className="mt-2 text-slate-500">Sign in to continue chatting</p>
      </div>
      <div>
        <label className="block mb-2 text-sm font-semibold text-slate-700">
          Email Address
        </label>
        <input
          className="w-full h-[48px] px-5 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          value={email}
          type="email"
          placeholder="Enter your email address"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm font-semibold text-slate-700">
          Password
        </label>

        <div className="relative">
          <input
            className="w-full h-[48px] px-5 pr-24 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="Enter your password"
          />

          <button
            onClick={handleClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-all"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        onClick={submitHandler}
        className="w-full h-[48px] rounded-2xl bg-blue-600 text-white font-bold text-[15px] hover:bg-blue-700 transition-all disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      <button
        onClick={() => {
          setEmail("guest@example.com");
          setPassword("123456");
        }}
        className="w-full h-[48px] rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[14px] hover:bg-slate-200 transition-all"
      >
        Use Guest Account
      </button>
    </div>
  );
};

export default Login;