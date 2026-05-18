import {
  normalizeDate,
  queryAll,
  queryOne,
  run,
  transaction,
} from "../lib/database.js";
import { getDailyTimeSlots } from "../lib/timeSlots.js";
import { getAdminBarbers } from "./barberService.js";

const formatTimeLabel = (time) => String(time || "").replace(":", ".");

export const ensureSchedulesForDate = (date = normalizeDate()) => {
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

export const updateScheduleStatusById = (scheduleId, status) =>
  updateScheduleStatus(Number(scheduleId), status);

export const generateSchedulesForDate = (date, barberId = null) =>
  generateSchedules(date, barberId ? Number(barberId) : null);

export const listSchedules = ({
  date = normalizeDate(),
  barberId = null,
} = {}) => getScheduleRows({ date, barberId });

export const getAdminSchedulesData = (
  date = normalizeDate(),
  barberId = null,
) => ({
  date,
  barberId,
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date, barberId }),
});
