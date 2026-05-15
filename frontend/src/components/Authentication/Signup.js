import API from "../../config/api";
import { useState } from "react";
import { useHistory } from "react-router";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dgrpyrxrn";
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "chat-app";

const Signup = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const history = useHistory();

  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [confirmpassword, setConfirmpassword] = useState();
  const [password, setPassword] = useState();
  const [pic, setPic] = useState();
  const [picLoading, setPicLoading] = useState(false);

  const submitHandler = async () => {
    setPicLoading(true);
    console.log("[Signup] Clicked submit");
    console.log("[Signup] Values:", { name, email, password, confirmpassword, pic });
    if (!name || !email || !password || !confirmpassword) {
      console.warn("Please Fill all the Feilds");
      setPicLoading(false);
      return;
    }
    if (password !== confirmpassword) {
      console.warn("Passwords Do Not Match");
      return;
    }
    console.log(name, email, password, pic);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };
      console.log("[Signup] Sending request to backend...");
      const { data } = await API.post(
        "/api/user",
        {
          name,
          email,
          password,
          pic,
        },
        config
      );
      console.log("[Signup] Response received:", data);
      console.log("Registration Successful");
      localStorage.setItem("userInfo", JSON.stringify(data));
      setPicLoading(false);
      history.push("/chats");
    } catch (error) {
      console.log("[Signup] Error:", error);
      console.error("Error Occured!", error.response?.data?.message || error.message);
      setPicLoading(false);
    }
  };

  const postDetails = (pics) => {
    setPicLoading(true);
    if (pics === undefined) {
      console.warn("Please Select an Image!");
      return;
    }
    console.log(pics);
    if (pics.type === "image/jpeg" || pics.type === "image/png") {
      const data = new FormData();
      data.append("file", pics);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("cloud_name", CLOUDINARY_CLOUD_NAME);
      fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "post",
        body: data,
      })
        .then((res) => res.json())
        .then((data) => {
          setPic(data.url.toString());
          console.log(data.url.toString());
          setPicLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setPicLoading(false);
        });
    } else {
      console.warn("Please Select an Image!");
      setPicLoading(false);
      return;
          
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Full Name
        </label>
        <input
          className="w-full h-[56px] px-5 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] placeholder:text-[#8b93a7] focus:border-[#2453c4] transition-colors"
          placeholder="Enter your full name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Email Address
        </label>
        <input
          className="w-full h-[56px] px-5 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] placeholder:text-[#8b93a7] focus:border-[#2453c4] transition-colors"
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
            type={show ? "text" : "password"}
            placeholder="Create a password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-[12px] bg-white border border-[#e9edf7] text-[#2453c4] text-[13px] font-semibold hover:bg-[#f8f9fd] transition-colors"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Confirm Password
        </label>
        <div className="relative">
          <input
            className="w-full h-[56px] px-5 pr-20 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] placeholder:text-[#8b93a7] focus:border-[#2453c4] transition-colors"
            type={show ? "text" : "password"}
            placeholder="Confirm your password"
            onChange={(e) => setConfirmpassword(e.target.value)}
          />
          <button
            onClick={handleClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-[12px] bg-white border border-[#e9edf7] text-[#2453c4] text-[13px] font-semibold hover:bg-[#f8f9fd] transition-colors"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-2 text-[13px] font-semibold text-[#2d3142]">
          Profile Picture
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => postDetails(e.target.files[0])}
          className="w-full h-[56px] px-4 py-3 rounded-[18px] bg-[#f8f9fd] border border-[#e9edf7] outline-none text-[#2d3142] file:mr-4 file:px-4 file:h-10 file:border-0 file:rounded-[12px] file:bg-white file:text-[#2453c4] file:font-semibold"
        />
      </div>

      <button
        onClick={submitHandler}
        className="w-full h-[56px] rounded-[18px] bg-[#2453c4] text-white font-semibold text-[15px] shadow-[0_20px_35px_rgba(36,83,196,0.25)] hover:scale-[0.99] active:scale-[0.98] transition-all disabled:opacity-60"
        disabled={picLoading}
      >
        {picLoading ? "Creating account..." : "Create Account"}
      </button>
    </div>
  );
};

export default Signup;