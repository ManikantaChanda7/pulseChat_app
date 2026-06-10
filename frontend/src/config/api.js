import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001",
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  if (userInfo?.token) {
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/user/login") &&
      !originalRequest.url.includes("/api/user/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const { data } = await API.post("/api/user/refresh");

        const userInfo = JSON.parse(localStorage.getItem("userInfo"));

        if (userInfo) {
          userInfo.token = data.token;
          localStorage.setItem("userInfo", JSON.stringify(userInfo));
        }

        originalRequest.headers.Authorization = `Bearer ${data.token}`;

        return API(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("userInfo");
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default API;
