import axios from "axios";

const api = axios.create({ baseURL: "/" });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message ?? "Erro desconhecido";
    return Promise.reject(new Error(msg));
  }
);

export default api;
