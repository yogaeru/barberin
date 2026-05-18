import { verifyToken } from "../lib/auth.js";

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

const getCookieValue = (cookieHeader = "", name) => {
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const getTokenFromRequest = (req = {}) =>
  getBearerToken(req.headers?.authorization || "") ||
  getCookieValue(req.headers?.cookie || "", "barbersync-token");

const getAuthPayload = (req = {}) => {
  const token = getTokenFromRequest(req);
  return token ? verifyToken(token) : null;
};

const getRoleLandingPath = (role) => (role === "admin" ? "/admin" : "/");

const authRequired = (req, res, next) => {
  const payload = getAuthPayload(req);

  if (!payload) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  req.auth = payload;
  next();
};

const adminRequired = (req, res, next) => {
  const payload = getAuthPayload(req);

  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  req.auth = payload;
  next();
};

const guestOnly = (req, res, next) => {
  const payload = getAuthPayload(req);

  if (payload) {
    return res.redirect(getRoleLandingPath(payload.role));
  }

  return next();
};

const pageRoleRequired =
  (roles, fallbackPath = "/login") =>
  (req, res, next) => {
    const payload = getAuthPayload(req);

    if (!payload) {
      return res.redirect(fallbackPath);
    }

    if (!roles.includes(payload.role)) {
      return res.redirect(getRoleLandingPath(payload.role));
    }

    req.auth = payload;
    return next();
  };

export { authRequired, adminRequired, guestOnly, pageRoleRequired };
