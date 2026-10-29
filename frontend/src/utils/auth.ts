
const ACCESS_TOKEN_PREFIX = "duck_access_token";
const AUTH_ROLE_PREFIX = "duck_auth_role";

export type AuthRole =
  | "MEMBER"
  | "FRANCHISE"
  | "ADMIN"
  | "SUPER_ADMIN";

function getRoleStorageKey(role: AuthRole) {
  return `${ACCESS_TOKEN_PREFIX}_${role}`;
}

function getAuthRoleStorageKey(role: AuthRole) {
  return `${AUTH_ROLE_PREFIX}_${role}`;
}

function isAuthRole(value: string | null): value is AuthRole {
  return (
    value === "MEMBER" ||
    value === "FRANCHISE" ||
    value === "ADMIN" ||
    value === "SUPER_ADMIN"
  );
}

/**
 * Xác định phiên theo khu vực hiện tại.
 * Các tab cùng khu vực sẽ dùng chung phiên đăng nhập.
 */
function getCurrentRole(): AuthRole {
  const pathname = window.location.pathname;

  if (pathname.startsWith("/sadmin")) {
    return "SUPER_ADMIN";
  }

  if (pathname.startsWith("/admin")) {
    return "ADMIN";
  }

  if (pathname.startsWith("/franchise")) {
    return "FRANCHISE";
  }

  if (pathname.startsWith("/qtv")) {
    return "ADMIN";
  }

  return "MEMBER";
}

export function saveAuthSession(
  accessToken: string,
  role: AuthRole,
) {
  localStorage.setItem(getRoleStorageKey(role), accessToken);
  localStorage.setItem(getAuthRoleStorageKey(role), role);
}

export function getAccessToken(role?: AuthRole) {
  const currentRole = role ?? getCurrentRole();

  return localStorage.getItem(getRoleStorageKey(currentRole));
}

export function getAuthRole(role?: AuthRole): AuthRole | null {
  const currentRole = role ?? getCurrentRole();
  const storedRole = localStorage.getItem(
    getAuthRoleStorageKey(currentRole),
  );

  if (isAuthRole(storedRole) && storedRole === currentRole) {
    return storedRole;
  }

  return null;
}

export function clearAuthSession(role?: AuthRole) {
  const currentRole = role ?? getCurrentRole();

  localStorage.removeItem(getRoleStorageKey(currentRole));
  localStorage.removeItem(getAuthRoleStorageKey(currentRole));
}
