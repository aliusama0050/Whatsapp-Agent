import api from "./api";
import { setToken, clearToken } from "./tokenStorage";

export async function login(username: string, password: string, rememberMe = false) {
  const { data } = await api.post("/auth/login", { username, password, remember_me: rememberMe });
  setToken(data.access_token, data.remember_me);
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearToken();
  }
}

export async function getMe() {
  const { data } = await api.get("/users/me");
  return data;
}

export async function changePassword(current_password: string, new_password: string) {
  const { data } = await api.put("/users/me/password", { current_password, new_password });
  return data;
}
