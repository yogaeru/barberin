import { guestOnly, pageRoleRequired } from "../middleware/authMiddleware.js";
import {
  renderAboutPage,
  renderBookingPage,
  renderDashboardPage,
  renderForgotPasswordPage,
  renderHomePage,
  renderLoginPage,
  renderRegisterPage,
  renderStatusPage,
} from "../controllers/publicController.js";

const registerPublicRoutes = (app) => {
  app.get("/", renderHomePage);
  app.get("/booking", pageRoleRequired(["user"]), renderBookingPage);
  app.get("/status", pageRoleRequired(["user"]), renderStatusPage);
  app.get("/dashboard", pageRoleRequired(["user"]), renderDashboardPage);
  app.get("/login", guestOnly, renderLoginPage);
  app.get("/register", guestOnly, renderRegisterPage);
  app.get("/forgot-password", guestOnly, renderForgotPasswordPage);
  app.get("/about", pageRoleRequired(["user"]), renderAboutPage);
};

export { registerPublicRoutes };
