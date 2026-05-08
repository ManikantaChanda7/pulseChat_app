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
    <div className="flex flex-col gap-3">
      <div>
        <label className="block mb-1 text-sm font-medium">Name</label>
        <input
          className="w-full p-2 border rounded"
          placeholder="Enter Your Name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Email Address</label>
        <input
          className="w-full p-2 border rounded"
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
            type={show ? "text" : "password"}
            placeholder="Enter Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleClick}
            className="px-3 bg-gray-200 border rounded-r"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Confirm Password</label>
        <div className="flex">
          <input
            className="w-full p-2 border rounded-l"
            type={show ? "text" : "password"}
            placeholder="Confirm password"
            onChange={(e) => setConfirmpassword(e.target.value)}
          />
          <button
            onClick={handleClick}
            className="px-3 bg-gray-200 border rounded-r"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Upload your Picture</label>
        <input
          type="file"
          className="w-full p-2 border rounded"
          accept="image/*"
          onChange={(e) => postDetails(e.target.files[0])}
        />
      </div>

      <button
        onClick={submitHandler}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        disabled={picLoading}
      >
        {picLoading ? "Loading..." : "Sign Up"}
      </button>
    </div>
  );
};

export default Signup;