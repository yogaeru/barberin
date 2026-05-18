import { registerAdminRoutes } from "./adminRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerBookingRoutes } from "./bookingRoutes.js";
import { registerPublicApiRoutes } from "./publicApiRoutes.js";
import { registerPublicRoutes } from "./publicRoutes.js";

const registerAppRoutes = (app) => {
	registerPublicRoutes(app);
	registerPublicApiRoutes(app);
	registerAuthRoutes(app);
	registerBookingRoutes(app);
	registerAdminRoutes(app);
};

export { registerAppRoutes };
