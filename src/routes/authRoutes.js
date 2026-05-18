import { authRequired } from "../middleware/authMiddleware.js";
import { login, me, register } from "../controllers/authController.js";

const registerAuthRoutes = (app) => {
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/me", authRequired, me);
};

export { registerAuthRoutes };
