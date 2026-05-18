import { signToken } from "../lib/auth.js";
import { authenticateUser, registerAccount } from "../services/authService.js";

const setAuthCookie = (res, token) => {
  res.setHeader(
    "Set-Cookie",
    `barbersync-token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
  );
};

export const login = (req, res) => {
  const { identifier, password } = req.body;
  const result = authenticateUser(identifier, password);

  if (!result.ok) {
    return res.status(401).json(result);
  }

  const token = signToken(result.user);
  setAuthCookie(res, token);

  return res.json({
    ok: true,
    token,
    user: result.user,
  });
};

export const register = (req, res) => {
  const result = registerAccount(req.body);
  if (!result.ok) {
    return res.status(400).json(result);
  }

  const token = signToken(result.user);
  setAuthCookie(res, token);

  return res.status(201).json({ ok: true, token, user: result.user });
};

export const me = (req, res) => {
  res.json({ ok: true, auth: req.auth });
};
