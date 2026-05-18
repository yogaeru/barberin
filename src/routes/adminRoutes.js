import {
  adminRequired,
  pageRoleRequired,
} from "../middleware/authMiddleware.js";
import {
  generateSchedules,
  generateSchedulesForm,
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
  toggleBarberAvailabilityForm,
  updateBookingStatus,
  updateQueueStatus,
  updateScheduleStatus,
  updateScheduleStatusForm,
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
    toggleBarberAvailabilityForm,
  );

  app.post(
    "/admin/queue/update-status",
    pageRoleRequired(["admin"], "/login"),
    updateQueueStatus,
  );
  app.post(
    "/admin/schedules/generate",
    pageRoleRequired(["admin"], "/login"),
    generateSchedulesForm,
  );
  app.post(
    "/admin/schedules/:scheduleId/status",
    pageRoleRequired(["admin"], "/login"),
    updateScheduleStatusForm,
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
