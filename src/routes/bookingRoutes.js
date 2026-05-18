import { authRequired } from "../middleware/authMiddleware.js";
import {
  createBooking as createUserBooking,
  getCurrentUserBookings as getUserBookings,
} from "../controllers/bookingController.js";

const registerBookingRoutes = (app) => {
  app.get("/api/bookings/me", authRequired, getUserBookings);
  app.post("/api/bookings", authRequired, createUserBooking);
};

export { registerBookingRoutes };
