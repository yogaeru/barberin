import { authRequired } from "../middleware/authMiddleware.js";
import { login, logout, me, register } from "../controllers/authController.js";

const registerAuthRoutes = (app) => {
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/me", authRequired, me);
};

export { registerAuthRoutes };
