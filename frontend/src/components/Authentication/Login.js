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
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };

      const { data } = await API.post(
        "/api/user/login",
        { email, password },
        config
      );

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
    <div className="flex flex-col gap-5">
      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Email Address
        </label>
        <input
          className="w-full h-[56px] px-5 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] placeholder:text-[#8b93a7] focus:border-[#2453c4] transition-colors"
          value={email}
          type="email"
          placeholder="Enter your email address"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Password
        </label>

        <div className="relative">
          <input
            className="w-full h-[56px] px-5 pr-20 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] placeholder:text-[#8b93a7] focus:border-[#2453c4] transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="Enter your password"
          />

          <button
            onClick={handleClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-[12px] bg-white border border-[#e9edf7] text-[#2453c4] text-[13px] font-semibold hover:bg-[#f8f9fd] transition-colors"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        onClick={submitHandler}
        className="w-full h-[56px] rounded-[18px] bg-[#2453c4] text-white font-semibold text-[15px] shadow-[0_20px_35px_rgba(36,83,196,0.25)] hover:scale-[0.99] active:scale-[0.98] transition-all disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      <button
        onClick={() => {
          setEmail("guest@example.com");
          setPassword("123456");
        }}
        className="w-full h-[56px] rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] text-[#2d3142] font-semibold text-[14px] hover:bg-[#f4f6fc] transition-colors"
      >
        Use Guest Account
      </button>
    </div>
  );
};

export default Login;