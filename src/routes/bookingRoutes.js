import { authRequired } from "../middleware/authMiddleware.js";
import {
  createBooking as createUserBooking,
  getCurrentUserBookings as getUserBookings,
  getCurrentQueue,
  cancelBooking,
} from "../controllers/bookingController.js";

const registerBookingRoutes = (app) => {
  app.get("/api/bookings/me", authRequired, getUserBookings);
  app.get("/api/bookings/current-queue", authRequired, getCurrentQueue);
  app.patch("/api/bookings/:bookingId/cancel", authRequired, cancelBooking);
  app.post("/api/bookings", authRequired, createUserBooking);
};

export { registerBookingRoutes };
