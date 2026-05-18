import {
  generateSchedulesForDate,
  getAdminDashboardApiData,
  getAdminBarbersData,
  getAdminBookingsData,
  getAdminDashboardData,
  getAdminHistoryData,
  getAdminOrdersData,
  getAdminSalaryData,
  getAdminSchedulesData,
  getAdminUsersData,
  getAdminQueueData,
  toggleBarberAvailabilityById,
  updateBookingStatusById,
  updateScheduleStatusById,
} from "../services/adminService.js";

const renderAdmin = (res, view, currentPage, title, extra = {}) => {
  res.render(view, {
    layout: "admin/layout",
    title,
    currentPage,
    ...extra,
  });
};

export const renderAdminDashboard = (req, res) => {
  const data = getAdminDashboardData();
  renderAdmin(res, "admin/dashboard", "admin-dashboard", "Panel Admin", data);
};

export const renderAdminQueue = (req, res) => {
  renderAdmin(
    res,
    "admin/queue",
    "admin-queue",
    "Antrian Masuk",
    getAdminQueueData(),
  );
};

export const renderAdminOrders = (req, res) => {
  renderAdmin(
    res,
    "admin/orders",
    "admin-orders",
    "Daftar Order",
    getAdminOrdersData(),
  );
};

export const renderAdminBookings = (req, res) => {
  renderAdmin(
    res,
    "admin/bookings",
    "admin-bookings",
    "Daftar Booking",
    getAdminBookingsData(),
  );
};

export const renderAdminHistory = (req, res) => {
  renderAdmin(
    res,
    "admin/history",
    "admin-history",
    "Riwayat Transaksi",
    getAdminHistoryData(),
  );
};

export const renderAdminSalary = (req, res) => {
  renderAdmin(
    res,
    "admin/salary",
    "admin-salary",
    "Gaji Barber",
    getAdminSalaryData(),
  );
};

export const renderAdminUsers = (req, res) => {
  renderAdmin(
    res,
    "admin/users",
    "admin-users",
    "Daftar Pengguna",
    getAdminUsersData(),
  );
};

export const renderAdminKapster = (req, res) => {
  renderAdmin(
    res,
    "admin/kapster",
    "admin-kapster",
    "Daftar Kapster",
    getAdminBarbersData(),
  );
};

export const renderAdminSchedules = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  const barberId = req.query.barberId ? Number(req.query.barberId) : null;
  renderAdmin(
    res,
    "admin/schedules",
    "admin-schedules",
    "Jadwal Kapster",
    getAdminSchedulesData(date, barberId),
  );
};

export const toggleBarberAvailability = (req, res) => {
  const result = toggleBarberAvailabilityById(Number(req.params.id));
  if (!result.ok) {
    return res.status(404).json(result);
  }

  return res.json(result);
};

export const updateBookingStatus = (req, res) => {
  const allowed = [
    "menunggu",
    "dikonfirmasi",
    "dalam_proses",
    "selesai",
    "dibatalkan",
  ];
  if (!allowed.includes(req.body.statusBooking)) {
    return res.status(400).json({ ok: false, message: "Status tidak valid" });
  }

  const result = updateBookingStatusById(
    Number(req.params.bookingId),
    req.body.statusBooking,
  );
  if (!result.ok) {
    return res.status(404).json(result);
  }

  return res.json(result);
};

export const generateSchedules = (req, res) => {
  const date = req.body.date ? String(req.body.date) : undefined;
  const barberId = req.body.barberId ? Number(req.body.barberId) : null;
  return res
    .status(201)
    .json({ ok: true, schedules: generateSchedulesForDate(date, barberId) });
};

export const updateScheduleStatus = (req, res) => {
  const allowed = ["tersedia", "penuh", "libur"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ ok: false, message: "Status tidak valid" });
  }

  const result = updateScheduleStatusById(
    Number(req.params.scheduleId),
    req.body.status,
  );
  if (!result.ok) {
    return res.status(404).json(result);
  }

  return res.json(result);
};

export const getAdminDashboardApi = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  res.json(getAdminDashboardApiData(date));
};
