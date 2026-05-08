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
    <div className="flex flex-col gap-3">
      <div>
        <label className="block mb-1 text-sm font-medium">Email Address</label>
        <input
          className="w-full p-2 border rounded"
          value={email}
          type="email"
          placeholder="Enter Your Email Address"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Password</label>
        <div className="flex">
          <input
            className="w-full p-2 border rounded-l"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="Enter password"
          />
          <button
            onClick={handleClick}
            className="px-3 bg-gray-200 border rounded-r"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        onClick={submitHandler}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? "Loading..." : "Login"}
      </button>

      <button
        onClick={() => {
          setEmail("guest@example.com");
          setPassword("123456");
        }}
        className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
      >
        Get Guest User Credentials
      </button>
    </div>
  );
};

export default Login;