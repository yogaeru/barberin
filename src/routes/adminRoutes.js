import {
  adminRequired,
  pageRoleRequired,
} from "../middleware/authMiddleware.js";
import {
  generateSchedules,
  getAdminDashboardApi,
  renderAdminBookings,
  renderAdminDashboard,
  renderAdminHistory,
  renderAdminKapster,
  renderAdminOrders,
  renderAdminQueue,
  renderAdminSalary,
  renderAdminSchedules,
  renderAdminUsers,
  toggleBarberAvailability,
  updateBookingStatus,
  updateScheduleStatus,
} from "../controllers/adminController.js";

const registerAdminRoutes = (app) => {
  app.get(
    "/admin",
    pageRoleRequired(["admin"], "/login"),
    renderAdminDashboard,
  );
  app.get(
    "/admin/queue",
    pageRoleRequired(["admin"], "/login"),
    renderAdminQueue,
  );
  app.get(
    "/admin/orders",
    pageRoleRequired(["admin"], "/login"),
    renderAdminOrders,
  );
  app.get(
    "/admin/bookings",
    pageRoleRequired(["admin"], "/login"),
    renderAdminBookings,
  );
  app.get(
    "/admin/history",
    pageRoleRequired(["admin"], "/login"),
    renderAdminHistory,
  );
  app.get(
    "/admin/salary",
    pageRoleRequired(["admin"], "/login"),
    renderAdminSalary,
  );
  app.get(
    "/admin/users",
    pageRoleRequired(["admin"], "/login"),
    renderAdminUsers,
  );
  app.get(
    "/admin/kapster",
    pageRoleRequired(["admin"], "/login"),
    renderAdminKapster,
  );
  app.get(
    "/admin/schedules",
    pageRoleRequired(["admin"], "/login"),
    renderAdminSchedules,
  );
  app.get(
    "/admin/kapster/toggle/:id",
    pageRoleRequired(["admin"], "/login"),
    toggleBarberAvailability,
  );

  app.patch(
    "/api/admin/queue/:bookingId/status",
    adminRequired,
    updateBookingStatus,
  );
  app.post("/api/admin/schedules/generate", adminRequired, generateSchedules);
  app.patch(
    "/api/admin/schedules/:scheduleId",
    adminRequired,
    updateScheduleStatus,
  );
  app.post(
    "/api/admin/barbers/:id/toggle",
    adminRequired,
    toggleBarberAvailability,
  );
  app.get("/api/admin/dashboard", adminRequired, getAdminDashboardApi);
};

export { registerAdminRoutes };
