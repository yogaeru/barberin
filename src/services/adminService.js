import { generateSchedulesForDate, getAdminSchedulesData, updateScheduleStatusById } from "./scheduleService.js";
import { getAdminBarbers, getAdminBarbersData, getAdminSalaryData, toggleBarberAvailabilityById } from "./barberService.js";
import { getAdminBookingsData, getAdminHistoryData, getAdminQueueData, updateBookingStatusById } from "./bookingService.js";
import { getAdminDashboardApiData, getAdminDashboardData } from "./dashboardService.js";
import { getAdminOrdersData } from "./paymentService.js";
import { getAdminUsersData } from "./userService.js";

export {
  generateSchedulesForDate,
  getAdminBarbersData,
  getAdminBookingsData,
  getAdminDashboardApiData,
  getAdminDashboardData,
  getAdminHistoryData,
  getAdminOrdersData,
  getAdminQueueData,
  getAdminSalaryData,
  getAdminSchedulesData,
  getAdminUsersData,
  toggleBarberAvailabilityById,
  updateBookingStatusById,
  updateScheduleStatusById,
};
