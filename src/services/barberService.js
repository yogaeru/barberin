import { normalizeDate, queryAll, queryOne, run } from "../lib/database.js";

const getAdminSalary = () =>
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

export const toggleBarberAvailabilityById = (id) =>
  toggleBarberAvailability(Number(id));

export const listBarbers = (date = normalizeDate()) => getAdminBarbers(date);

export const getAdminSalaryData = () => ({
  salaries: getAdminSalary(),
});

export const getAdminBarbersData = (date = normalizeDate()) => ({
  barbers: getAdminBarbers(date),
});

export { getAdminSalary };
