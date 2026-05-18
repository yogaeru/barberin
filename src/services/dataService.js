import bcrypt from "bcryptjs";

import {
  normalizeDate,
  queryAll,
  queryOne,
  run,
  transaction,
} from "../lib/database.js";
import { getDailyTimeSlots, isValidScheduleTime } from "../lib/timeSlots.js";

const formatBookingCode = (bookingId) =>
  `BK-${String(bookingId).padStart(4, "0")}`;

const formatTimeLabel = (time) => String(time || "").replace(":", ".");

const roleStyles = {
  admin: {
    statusLabel: "Staff",
    statusClass: "bg-primary/20 text-primary border-primary/30",
  },
  barber: {
    statusLabel: "Barber",
    statusClass: "bg-info/20 text-info border-info/30",
  },
  user: {
    statusLabel: "Aktif",
    statusClass: "bg-success/20 text-success border-success/30",
  },
};

const getUserRowByIdentifier = (identifier) =>
  queryOne(`SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1`, [
    identifier,
    identifier,
  ]);

const ensureCustomerForUser = (userRow) => {
  const existing = queryOne(
    `SELECT customerId FROM customers WHERE userId = ? LIMIT 1`,
    [userRow.userId],
  );
  if (existing) {
    return existing.customerId;
  }

  run(`INSERT INTO customers (userId, nama, noHp) VALUES (?, ?, ?)`, [
    userRow.userId,
    userRow.nama,
    userRow.phone || null,
  ]);
  return (
    queryOne(
      `SELECT customerId AS id FROM customers WHERE userId = ? LIMIT 1`,
      [userRow.userId],
    )?.id || null
  );
};

const getPublicUser = (row) => {
  if (!row) return null;
  const style = roleStyles[row.role] || roleStyles.user;
  return {
    userId: row.userId,
    nama: row.nama,
    name: row.nama,
    username: row.username,
    email: row.email || "",
    phone: row.phone || "",
    role: row.role,
    bookings: Number(row.bookingsCount) || 0,
    lastActive: row.lastActiveAt || null,
    statusLabel: style.statusLabel,
    statusClass: style.statusClass,
  };
};

const serializeBooking = (row, extra = {}) => {
  if (!row) return null;
  return {
    bookingId: row.bookingCode || formatBookingCode(row.bookingId),
    rawBookingId: row.bookingId,
    bookingCode: row.bookingCode || formatBookingCode(row.bookingId),
    userEmail: row.userEmail || "",
    userName: row.customerName || row.userName || "Pengguna",
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    barberId: row.barberId,
    barberName: row.barberName || "Siapa Saja",
    date: row.tanggalBooking,
    time: row.jamBooking,
    jamBooking: row.jamBooking,
    harga: Number(row.totalHarga || row.servicePrice || 0),
    catatan: row.catatan || "",
    statusBooking: row.statusBooking,
    nomorAntrian: Number(row.nomorAntrian) || 1,
    currentNumber: Number(extra.currentNumber || row.nomorAntrian || 1),
    totalQueue: Number(extra.totalQueue || 1),
    estimasiWaktu: row.estimasiWaktu || "20-30 menit",
    progress:
      row.statusBooking === "selesai"
        ? 100
        : row.statusBooking === "dalam_proses"
          ? 65
          : 35,
    jenisKedatangan: row.jenisKedatangan,
  };
};

const ensureSchedulesForDate = (date = normalizeDate()) => {
  const targetDate = normalizeDate(date);
  const existingSlots =
    queryOne(
      `SELECT COUNT(*) AS count FROM schedules WHERE tanggalJadwal = ?`,
      [targetDate],
    )?.count || 0;
  if (existingSlots > 0) {
    return;
  }

  const activeBarbers = queryAll(
    `SELECT barberId FROM barbers WHERE status = 'aktif'`,
  );
  const slots = getDailyTimeSlots();
  transaction(() => {
    for (const barber of activeBarbers) {
      for (const slot of slots) {
        run(
          `INSERT INTO schedules (barberId, tanggalJadwal, jamMulai, jamSelesai, status)
           VALUES (?, ?, ?, ?, 'tersedia')`,
          [barber.barberId, targetDate, slot.startTime, slot.endTime],
        );
      }
    }
  });
};

export const getServices = () =>
  queryAll(
    `SELECT * FROM services WHERE isActive = 1 ORDER BY serviceId ASC`,
  ).map((row) => ({
    serviceId: row.serviceId,
    namaService: row.namaService,
    harga: Number(row.harga),
    durasi: Number(row.durasi),
    deskripsi: row.deskripsi || "",
  }));

export const getBarbers = (date = normalizeDate()) => {
  const targetDate = normalizeDate(date);
  const scheduleCounts = queryAll(
    `SELECT barberId, COUNT(*) AS totalSlots, SUM(CASE WHEN status = 'tersedia' THEN 1 ELSE 0 END) AS availableSlots
     FROM schedules
     WHERE tanggalJadwal = ?
     GROUP BY barberId`,
    [targetDate],
  );
  const countMap = new Map(
    scheduleCounts.map((item) => [Number(item.barberId), item]),
  );

  return queryAll(`SELECT * FROM barbers ORDER BY barberId ASC`).map(
    (barber) => {
      const stats = countMap.get(Number(barber.barberId));
      const availableToday =
        Number(barber.isAvailableToday) === 1 &&
        Number(stats?.availableSlots || 0) > 0;
      return {
        id: `BR-${String(barber.barberId).padStart(2, "0")}`,
        barberId: barber.barberId,
        name: barber.nama,
        role: barber.status === "aktif" ? "Barber" : "Nonaktif",
        availableToday,
        lastActive: barber.updatedAt || "Baru saja",
      };
    },
  );
};

export const getAdminBarbers = (date = normalizeDate()) => getBarbers(date);

export const getScheduleRows = ({
  date = normalizeDate(),
  barberId = null,
} = {}) => {
  ensureSchedulesForDate(date);
  const params = [normalizeDate(date)];
  let barberFilter = "";
  if (barberId) {
    barberFilter = "AND s.barberId = ?";
    params.push(Number(barberId));
  }

  return queryAll(
    `SELECT s.*, b.nama AS barberName, b.username AS barberUsername
     FROM schedules s
     JOIN barbers b ON b.barberId = s.barberId
     WHERE s.tanggalJadwal = ? ${barberFilter}
     ORDER BY b.nama ASC, s.jamMulai ASC`,
    params,
  ).map((row) => ({
    scheduleId: row.scheduleId,
    barberId: row.barberId,
    barberName: row.barberName,
    barberUsername: row.barberUsername,
    date: row.tanggalJadwal,
    time: row.jamMulai,
    timeLabel: formatTimeLabel(row.jamMulai),
    endTime: row.jamSelesai,
    status: row.status,
    bookingId: row.bookingId,
    isAvailable: row.status === "tersedia",
  }));
};

const getBookingJoinedRows = (where = "", params = []) =>
  queryAll(
    `SELECT
       bk.*,
       c.nama AS customerName,
       c.noHp AS customerPhone,
       u.nama AS userName,
       u.username AS userUsername,
       u.email AS userEmail,
       s.namaService AS serviceName,
       s.harga AS servicePrice,
       s.durasi AS serviceDuration,
       b.nama AS barberName
     FROM bookings bk
     LEFT JOIN customers c ON c.customerId = bk.customerId
     LEFT JOIN users u ON u.userId = bk.userId
     LEFT JOIN services s ON s.serviceId = bk.serviceId
     LEFT JOIN barbers b ON b.barberId = bk.barberId
     ${where}
     ORDER BY bk.createdAt DESC, bk.bookingId DESC`,
    params,
  );

export const getQueueEntries = () => {
  const rows = getBookingJoinedRows(
    `WHERE bk.statusBooking IN ('menunggu', 'dikonfirmasi', 'dalam_proses')`,
  );
  const totalQueue = rows.length || 0;
  const currentNumber =
    rows.find((item) => item.statusBooking === "dalam_proses")?.nomorAntrian ||
    rows[0]?.nomorAntrian ||
    0;

  return rows.map((row) =>
    serializeBooking(row, { currentNumber, totalQueue }),
  );
};

export const getBookings = () =>
  getBookingJoinedRows().map((row) => serializeBooking(row));

export const getBookingsForUser = (userId) =>
  getBookingJoinedRows(`WHERE bk.userId = ?`, [userId]).map((row) =>
    serializeBooking(row, { totalQueue: 1 }),
  );

const getActiveBookingForUser = (userId) =>
  queryOne(
    `SELECT * FROM bookings WHERE userId = ? AND statusBooking NOT IN ('selesai', 'dibatalkan') ORDER BY createdAt DESC LIMIT 1`,
    [userId],
  );

const getBookingByRawId = (rawBookingId) =>
  queryOne(`SELECT * FROM bookings WHERE bookingId = ? LIMIT 1`, [
    rawBookingId,
  ]);

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

export const getAdminOrders = () =>
  queryAll(
    `SELECT
       p.paymentId,
       p.jumlahBayar,
       p.metodePembayaran,
       p.statusPembayaran,
       bk.bookingId,
       bk.bookingCode,
       bk.jamBooking,
       c.nama AS customerName,
       s.namaService AS serviceName
     FROM payments p
     JOIN bookings bk ON bk.bookingId = p.bookingId
     JOIN customers c ON c.customerId = bk.customerId
     JOIN services s ON s.serviceId = bk.serviceId
     ORDER BY p.createdAt DESC, p.paymentId DESC`,
  ).map((row) => ({
    id: row.bookingCode || formatBookingCode(row.bookingId),
    customer: row.customerName,
    service: row.serviceName,
    amount: Number(row.jumlahBayar),
    payment: String(row.metodePembayaran || "").toUpperCase(),
    time: row.jamBooking,
    statusLabel:
      row.statusPembayaran === "sudah_bayar"
        ? "Lunas"
        : row.statusPembayaran === "belum_bayar"
          ? "Menunggu"
          : "Refund",
    statusClass:
      row.statusPembayaran === "sudah_bayar"
        ? "bg-success/20 text-success border-success/30"
        : row.statusPembayaran === "belum_bayar"
          ? "bg-warning/20 text-warning border-warning/30"
          : "bg-error/20 text-error border-error/30",
  }));

export const getAdminHistory = () =>
  getBookingJoinedRows(
    `WHERE bk.statusBooking IN ('selesai', 'dibatalkan')`,
  ).map((row) => ({
    id: row.bookingCode || formatBookingCode(row.bookingId),
    customer: row.customerName,
    service: row.serviceName,
    amount: Number(row.totalHarga || row.servicePrice || 0),
    barber: row.barberName || "-",
    completedAt: row.updatedAt,
    statusLabel: row.statusBooking === "selesai" ? "Selesai" : "Dibatalkan",
    statusClass:
      row.statusBooking === "selesai"
        ? "bg-success/20 text-success border-success/30"
        : "bg-error/20 text-error border-error/30",
  }));

export const getAdminSalary = () =>
  queryAll(
    `SELECT * FROM barbers WHERE status = 'aktif' ORDER BY nama ASC`,
  ).map((barber) => {
    const stats = queryOne(
      `SELECT COUNT(*) AS count, COALESCE(SUM(totalHarga), 0) AS totalRevenue
       FROM bookings
       WHERE barberId = ? AND statusBooking = 'selesai'`,
      [barber.barberId],
    );

    const baseSalary = 4000000;
    const bonus = Math.round(Number(stats?.totalRevenue || 0) * 0.1);
    const deduction = 0;
    const payout = baseSalary + bonus - deduction;

    return {
      name: barber.nama,
      role: "Barber",
      completedOrders: Number(stats?.count || 0),
      baseSalary,
      bonus,
      deduction,
      payout,
      statusLabel: "Siap Dibayar",
      statusClass: "bg-warning/20 text-warning border-warning/30",
    };
  });

export const getAdminUsers = () =>
  queryAll(
    `SELECT * FROM users ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'barber' THEN 1 ELSE 2 END, createdAt ASC`,
  ).map((user) => {
    const style = roleStyles[user.role] || roleStyles.user;
    return {
      userId: user.userId,
      nama: user.nama,
      name: user.nama,
      username: user.username,
      email: user.email || "",
      phone: user.phone || "-",
      role: user.role,
      bookings: Number(user.bookingsCount) || 0,
      lastActive: user.lastActiveAt || "Baru saja",
      statusLabel: style.statusLabel,
      statusClass: style.statusClass,
    };
  });

export const loginUser = (identifier, password) => {
  const user = getUserRowByIdentifier(identifier);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { ok: false, message: "Username/Email atau kata sandi salah" };
  }

  run(
    `UPDATE users SET lastActiveAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
    [user.userId],
  );
  return { ok: true, user: getPublicUser(user) };
};

export const registerUser = ({ username, name, email, phone, password }) => {
  const trimmedUsername = String(username || "").trim();
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim();
  const trimmedPhone = String(phone || "").trim();
  if (!trimmedUsername || !trimmedName || !trimmedEmail || !password) {
    return { ok: false, message: "Semua field harus diisi" };
  }

  if (getUserRowByIdentifier(trimmedUsername)) {
    return { ok: false, message: "Username sudah terdaftar" };
  }
  if (
    queryOne(`SELECT userId FROM users WHERE email = ? LIMIT 1`, [trimmedEmail])
  ) {
    return { ok: false, message: "Email sudah terdaftar" };
  }

  run(
    `INSERT INTO users (nama, username, email, phone, passwordHash, role, bookingsCount, lastActiveAt)
     VALUES (?, ?, ?, ?, ?, 'user', 0, CURRENT_TIMESTAMP)`,
    [
      trimmedName,
      trimmedUsername,
      trimmedEmail,
      trimmedPhone,
      bcrypt.hashSync(password, 10),
    ],
  );

  const user = getUserRowByIdentifier(trimmedUsername);
  ensureCustomerForUser(user);
  return { ok: true, user: getPublicUser(user) };
};

export const updateUserProfile = (identifier, updates = {}) => {
  const user = getUserRowByIdentifier(identifier);
  if (!user) {
    return { ok: false, message: "Profil tidak ditemukan" };
  }

  const nextUsername = String(updates.username || user.username).trim();
  const nextName = String(updates.name || updates.nama || user.nama).trim();
  const nextEmail =
    updates.email === undefined ? user.email : String(updates.email).trim();
  const nextPhone =
    updates.phone === undefined ? user.phone : String(updates.phone).trim();

  if (
    nextUsername !== user.username &&
    queryOne(
      `SELECT userId FROM users WHERE username = ? AND userId != ? LIMIT 1`,
      [nextUsername, user.userId],
    )
  ) {
    return { ok: false, message: "Username sudah digunakan akun lain" };
  }
  if (
    nextEmail &&
    nextEmail !== user.email &&
    queryOne(
      `SELECT userId FROM users WHERE email = ? AND userId != ? LIMIT 1`,
      [nextEmail, user.userId],
    )
  ) {
    return { ok: false, message: "Email sudah digunakan akun lain" };
  }

  run(
    `UPDATE users SET nama = ?, username = ?, email = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
    [nextName, nextUsername, nextEmail || null, nextPhone || null, user.userId],
  );

  const updated = getUserRowByIdentifier(nextUsername);
  return { ok: true, user: getPublicUser(updated) };
};

export const changeUserPassword = (
  identifier,
  currentPassword,
  newPassword,
) => {
  const user = getUserRowByIdentifier(identifier);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return { ok: false, message: "Kata sandi saat ini salah" };
  }

  run(
    `UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
    [bcrypt.hashSync(newPassword, 10), user.userId],
  );
  return { ok: true };
};

export const createBooking = ({
  userId,
  serviceId,
  barberId,
  date,
  time,
  catatan = "",
}) => {
  const user = queryOne(`SELECT * FROM users WHERE userId = ? LIMIT 1`, [
    userId,
  ]);
  if (!user) {
    return { ok: false, message: "Pengguna tidak ditemukan" };
  }
  if (getActiveBookingForUser(user.userId)) {
    return { ok: false, message: "Anda hanya dapat memiliki 1 booking aktif." };
  }

  const service = queryOne(
    `SELECT * FROM services WHERE serviceId = ? AND isActive = 1 LIMIT 1`,
    [serviceId],
  );
  if (!service) {
    return { ok: false, message: "Layanan tidak ditemukan" };
  }

  const targetDate = normalizeDate(date);
  if (!isValidScheduleTime(time)) {
    return { ok: false, message: "Jam booking tidak valid" };
  }

  ensureSchedulesForDate(targetDate);
  let scheduleRow = null;
  if (barberId) {
    scheduleRow = queryOne(
      `SELECT * FROM schedules WHERE barberId = ? AND tanggalJadwal = ? AND jamMulai = ? LIMIT 1`,
      [barberId, targetDate, time],
    );
  }
  if (!scheduleRow) {
    scheduleRow = queryOne(
      `SELECT * FROM schedules WHERE tanggalJadwal = ? AND jamMulai = ? AND status = 'tersedia' ORDER BY barberId ASC LIMIT 1`,
      [targetDate, time],
    );
  }
  if (!scheduleRow || scheduleRow.status !== "tersedia") {
    return { ok: false, message: "Slot waktu sudah penuh" };
  }

  const customerId = ensureCustomerForUser(user);
  const activeCount =
    queryOne(
      `SELECT COUNT(*) AS count FROM bookings WHERE tanggalBooking = ? AND statusBooking IN ('menunggu', 'dikonfirmasi', 'dalam_proses')`,
      [targetDate],
    )?.count || 0;

  run(
    `INSERT INTO bookings (
      bookingCode, customerId, serviceId, userId, barberId, scheduleId,
      tanggalBooking, jamBooking, nomorAntrian, statusBooking, jenisKedatangan,
      catatan, totalHarga
    ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', 'online', ?, ?)`,
    [
      customerId,
      service.serviceId,
      user.userId,
      scheduleRow.barberId,
      scheduleRow.scheduleId,
      targetDate,
      time,
      activeCount + 1,
      catatan || null,
      Number(service.harga),
    ],
  );

  const bookingId = Number(
    queryOne(`SELECT MAX(bookingId) AS id FROM bookings`)?.id || 0,
  );
  const bookingCode = formatBookingCode(bookingId);
  run(`UPDATE bookings SET bookingCode = ? WHERE bookingId = ?`, [
    bookingCode,
    bookingId,
  ]);
  run(
    `UPDATE schedules SET status = 'penuh', bookingId = ?, updatedAt = CURRENT_TIMESTAMP WHERE scheduleId = ?`,
    [bookingId, scheduleRow.scheduleId],
  );
  run(
    `UPDATE users SET bookingsCount = COALESCE(bookingsCount, 0) + 1, lastActiveAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
    [user.userId],
  );

  const booking = serializeBooking(
    queryOne(
      `SELECT
         bk.*,
         c.nama AS customerName,
         c.noHp AS customerPhone,
         u.nama AS userName,
         u.username AS userUsername,
         u.email AS userEmail,
         s.namaService AS serviceName,
         s.harga AS servicePrice,
         s.durasi AS serviceDuration,
         b.nama AS barberName
       FROM bookings bk
       LEFT JOIN customers c ON c.customerId = bk.customerId
       LEFT JOIN users u ON u.userId = bk.userId
       LEFT JOIN services s ON s.serviceId = bk.serviceId
       LEFT JOIN barbers b ON b.barberId = bk.barberId
       WHERE bk.bookingId = ? LIMIT 1`,
      [bookingId],
    ),
    { currentNumber: activeCount + 1, totalQueue: activeCount + 1 },
  );

  return { ok: true, booking };
};

export const updateBookingStatus = (bookingId, statusBooking) => {
  const booking = getBookingByRawId(bookingId);
  if (!booking) {
    return { ok: false, message: "Booking tidak ditemukan" };
  }

  run(
    `UPDATE bookings SET statusBooking = ?, updatedAt = CURRENT_TIMESTAMP WHERE bookingId = ?`,
    [statusBooking, bookingId],
  );
  if (statusBooking === "selesai" || statusBooking === "dibatalkan") {
    run(
      `UPDATE schedules SET status = 'tersedia', bookingId = NULL, updatedAt = CURRENT_TIMESTAMP WHERE scheduleId = ?`,
      [booking.scheduleId],
    );
  }

  const refreshed = queryOne(
    `SELECT
       bk.*,
       c.nama AS customerName,
       c.noHp AS customerPhone,
       u.nama AS userName,
       u.username AS userUsername,
       u.email AS userEmail,
       s.namaService AS serviceName,
       s.harga AS servicePrice,
       s.durasi AS serviceDuration,
       b.nama AS barberName
     FROM bookings bk
     LEFT JOIN customers c ON c.customerId = bk.customerId
     LEFT JOIN users u ON u.userId = bk.userId
     LEFT JOIN services s ON s.serviceId = bk.serviceId
     LEFT JOIN barbers b ON b.barberId = bk.barberId
     WHERE bk.bookingId = ? LIMIT 1`,
    [bookingId],
  );

  return { ok: true, booking: serializeBooking(refreshed) };
};

export const updateScheduleStatus = (scheduleId, status) => {
  const schedule = queryOne(
    `SELECT * FROM schedules WHERE scheduleId = ? LIMIT 1`,
    [scheduleId],
  );
  if (!schedule) {
    return { ok: false, message: "Jadwal tidak ditemukan" };
  }

  run(
    `UPDATE schedules SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE scheduleId = ?`,
    [status, scheduleId],
  );
  if (status !== "penuh") {
    run(`UPDATE schedules SET bookingId = NULL WHERE scheduleId = ?`, [
      scheduleId,
    ]);
  }

  const updated = getScheduleRows({
    date: schedule.tanggalJadwal,
    barberId: schedule.barberId,
  }).find((item) => item.scheduleId === scheduleId);
  return { ok: true, schedule: updated };
};

export const generateSchedules = (date, barberId = null) => {
  const targetDate = normalizeDate(date);
  const slots = getDailyTimeSlots();
  const barbers = barberId
    ? queryAll(`SELECT * FROM barbers WHERE barberId = ?`, [Number(barberId)])
    : queryAll(`SELECT * FROM barbers WHERE status = 'aktif'`);

  transaction(() => {
    for (const barber of barbers) {
      for (const slot of slots) {
        run(
          `INSERT OR IGNORE INTO schedules (barberId, tanggalJadwal, jamMulai, jamSelesai, status)
           VALUES (?, ?, ?, ?, 'tersedia')`,
          [barber.barberId, targetDate, slot.startTime, slot.endTime],
        );
      }
    }
  });

  return getScheduleRows({ date: targetDate, barberId });
};

export const toggleBarberAvailability = (barberId) => {
  const barber = queryOne(`SELECT * FROM barbers WHERE barberId = ? LIMIT 1`, [
    barberId,
  ]);
  if (!barber) {
    return { ok: false, message: "Kapster tidak ditemukan" };
  }

  run(
    `UPDATE barbers SET isAvailableToday = ?, updatedAt = CURRENT_TIMESTAMP WHERE barberId = ?`,
    [Number(barber.isAvailableToday) === 1 ? 0 : 1, barberId],
  );
  return { ok: true };
};

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

export const getAdminQueueData = () => ({
  queue: getQueueEntries(),
});

export const getAdminOrdersData = () => ({
  orders: getAdminOrders(),
});

export const getAdminBookingsData = () => ({
  bookings: getBookings(),
});

export const getAdminHistoryData = () => ({
  history: getAdminHistory(),
});

export const getAdminSalaryData = () => ({
  salaries: getAdminSalary(),
});

export const getAdminUsersData = () => ({
  users: getAdminUsers(),
});

export const getAdminBarbersData = (date = normalizeDate()) => ({
  barbers: getAdminBarbers(date),
});

export const getAdminSchedulesData = (
  date = normalizeDate(),
  barberId = null,
) => ({
  date,
  barberId,
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date, barberId }),
});

export const toggleBarberAvailabilityById = (id) =>
  toggleBarberAvailability(Number(id));

export const updateBookingStatusById = (bookingId, statusBooking) =>
  updateBookingStatus(Number(bookingId), statusBooking);

export const generateSchedulesForDate = (date, barberId = null) =>
  generateSchedules(date, barberId ? Number(barberId) : null);

export const updateScheduleStatusById = (scheduleId, status) =>
  updateScheduleStatus(Number(scheduleId), status);

export const listServices = () => getServices();

export const listBarbers = (date = normalizeDate()) => getAdminBarbers(date);

export const listSchedules = ({
  date = normalizeDate(),
  barberId = null,
} = {}) => getScheduleRows({ date, barberId });

export const getHomePageData = () => ({
  services: getServices(),
});

export const getBookingPageData = (date = normalizeDate()) => ({
  services: getServices(),
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date }),
  date,
});

export const getDashboardPageData = () => ({});

export const getStatusPageData = () => ({});

export const getAboutPageData = () => ({});

export const getLoginPageData = () => ({});

export const getRegisterPageData = () => ({});

export const getForgotPasswordPageData = () => ({});

export const getPublicBootstrapData = (date = normalizeDate()) => ({
  services: getServices(),
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date }),
  date,
});

export const authenticateUser = (identifier, password) =>
  loginUser(identifier, password);

export const registerAccount = (payload) => registerUser(payload);

export const listCurrentUserBookings = (userId) => getBookingsForUser(userId);

export const createUserBooking = (payload) => createBooking(payload);

export const getUsers = () => getAdminUsers();

export { getPublicUser, serializeBooking, formatBookingCode };
