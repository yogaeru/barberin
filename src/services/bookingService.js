import { normalizeDate, queryAll, queryOne, run } from "../lib/database.js";
import { isValidScheduleTime } from "../lib/timeSlots.js";
import { getUserRowByIdentifier, ensureCustomerForUser } from "./userService.js";
import { ensureSchedulesForDate } from "./scheduleService.js";

const formatBookingCode = (bookingId) =>
  `BK-${String(bookingId).padStart(4, "0")}`;

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

const getActiveBookingForUser = (userId) =>
  queryOne(
    `SELECT * FROM bookings WHERE userId = ? AND statusBooking NOT IN ('selesai', 'dibatalkan') ORDER BY createdAt DESC LIMIT 1`,
    [userId],
  );

const getBookingByRawId = (rawBookingId) =>
  queryOne(`SELECT * FROM bookings WHERE bookingId = ? LIMIT 1`, [
    rawBookingId,
  ]);

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

export const updateBookingStatusById = (bookingId, statusBooking) =>
  updateBookingStatus(Number(bookingId), statusBooking);

export const listCurrentUserBookings = (userId) => getBookingsForUser(userId);

export const createUserBooking = (payload) => createBooking(payload);

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

export const getAdminQueueData = () => ({
  queue: getQueueEntries(),
});

export const getAdminBookingsData = () => ({
  bookings: getBookings(),
});

export const getAdminHistoryData = () => ({
  history: getAdminHistory(),
});

export { serializeBooking, formatBookingCode, getBookingByRawId, getBookingJoinedRows };
