// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // change if needed
  withCredentials: true,
});

export default api;
