import API from "../../config/api";
import { useState } from "react";
import { useHistory } from "react-router";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

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
    console.log("[Signup] Values:", {
      name,
      email,
      password,
      confirmpassword,
      pic,
    });
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
      console.log("[Signup] Sending request to backend...");
      const { data } = await API.post("/api/user", {
        name,
        email,
        password,
        pic,
      });
      console.log("[Signup] Response received:", data);
      console.log("Registration Successful");
      localStorage.setItem("userInfo", JSON.stringify(data));
      setPicLoading(false);
      history.push("/chats");
    } catch (error) {
      console.log("[Signup] Error:", error);
      console.error(
        "Error Occured!",
        error.response?.data?.message || error.message,
      );
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
      fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "post",
          body: data,
        },
      )
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
    <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
      <div className="text-center mb-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-3xl bg-blue-600 text-white text-2xl font-bold mb-4">
          ✨
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Join the conversation in seconds
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Full Name
          </label>
          <input
            className="w-full h-[48px] px-5 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Enter your full name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Email Address
          </label>
          <input
            className="w-full h-[48px] px-5 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            type="email"
            placeholder="Enter your email address"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              className="w-full h-[48px] px-5 pr-24 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              type={show ? "text" : "password"}
              placeholder="Create a password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={handleClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-all"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>
      <div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Confirm Password
          </label>
          <div className="relative">
            <input
              className="w-full h-[48px] px-5 pr-24 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              type={show ? "text" : "password"}
              placeholder="Confirm your password"
              onChange={(e) => setConfirmpassword(e.target.value)}
            />
            <button
              onClick={handleClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 h-10 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-all"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block mb-2 text-sm font-semibold text-slate-700">
          Profile Picture
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => postDetails(e.target.files[0])}
          className="w-full h-[48px] px-3 py-2 rounded-xl bg-slate-50 border border-dashed border-slate-300 outline-none text-slate-600 file:mr-3 file:px-3 file:h-8 file:border-0 file:rounded-lg file:bg-blue-600 file:text-white file:font-semibold"
        />
      </div>

      <button
        onClick={submitHandler}
        className="w-full h-[48px] rounded-2xl bg-blue-600 text-white font-bold text-[15px] hover:bg-blue-700 transition-all disabled:opacity-60"
        disabled={picLoading}
      >
        {picLoading ? "Creating account..." : "Create Account"}
      </button>
    </div>
  );
};

export default Signup;
