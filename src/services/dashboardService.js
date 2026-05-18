import { normalizeDate, queryOne } from "../lib/database.js";
import { getQueueEntries, getBookings } from "./bookingService.js";
import { getAdminBarbers } from "./barberService.js";
import { getAdminUsers } from "./userService.js";
import { getServices } from "./serviceService.js";
import { getAdminOrders } from "./paymentService.js";
import { getAdminHistory } from "./bookingService.js";
import { getAdminSalary } from "./barberService.js";

export const getDashboardSummary = (date = normalizeDate()) => ({
  activeQueue:
    queryOne(
      `SELECT COUNT(*) AS count FROM bookings WHERE statusBooking IN ('menunggu', 'dikonfirmasi', 'dalam_proses')`,
    )?.count || 0,
  todayBookings:
    queryOne(
      `SELECT COUNT(*) AS count FROM bookings WHERE tanggalBooking = ?`,
      [normalizeDate(date)],
    )?.count || 0,
  paidOrders:
    queryOne(
      `SELECT COUNT(*) AS count FROM payments WHERE statusPembayaran = 'sudah_bayar'`,
    )?.count || 0,
  userCount: queryOne(`SELECT COUNT(*) AS count FROM users`)?.count || 0,
});

export const getAdminDashboardData = (date = normalizeDate()) => ({
  summary: getDashboardSummary(date),
  queue: getQueueEntries(),
  bookings: getBookings(),
  users: getAdminUsers(),
  barbers: getAdminBarbers(date),
  orders: getAdminOrders(),
  history: getAdminHistory(),
  salaries: getAdminSalary(),
});

export const getAdminDashboardApiData = (date = normalizeDate()) => ({
  ok: true,
  summary: getDashboardSummary(date),
  queue: getQueueEntries(),
  bookings: getBookings(),
  users: getAdminUsers(),
  services: getServices(),
  barbers: getAdminBarbers(date),
  orders: getAdminOrders(),
  history: getAdminHistory(),
  salaries: getAdminSalary(),
});
