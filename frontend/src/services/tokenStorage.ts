const TOKEN_KEY = "access_token";
const REMEMBER_KEY = "remember_me";

/**
 * Determines whether the user chose "Remember Me" on login.
 * This flag is stored in localStorage so it survives browser restarts.
 */
function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

/** Returns the active storage (localStorage if remembered, sessionStorage otherwise). */
function getStorage(): Storage {
  return isRemembered() ? localStorage : sessionStorage;
}

/** Save token after login or refresh. */
export function setToken(token: string, rememberMe?: boolean): void {
  // On login, persist the remember preference
  if (rememberMe !== undefined) {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }
  // Clear from the other storage to avoid stale tokens
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  // Write to the correct storage
  getStorage().setItem(TOKEN_KEY, token);
}

/** Read the access token (checks both storages). */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/** Clear everything on logout. */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}
