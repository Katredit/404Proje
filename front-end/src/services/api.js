import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Her istekte localStorage'daki token'ı header'a ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kap_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
