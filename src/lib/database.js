import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import initSqlJs from "sql.js";

import { getDailyTimeSlots } from "./timeSlots.js";
import { demoUsers, seedBarbers, seedServices } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFilePath = path.resolve(__dirname, "../db/barbersync.sqlite");
const schemaPath = path.resolve(__dirname, "../db/001_create_tables.sql");

const SQL = await initSqlJs({
  locateFile: (file) =>
    path.resolve(__dirname, "../../node_modules/sql.js/dist", file),
});

const database = fs.existsSync(dbFilePath)
  ? new SQL.Database(fs.readFileSync(dbFilePath))
  : new SQL.Database();

let inTransaction = false;

const persist = () => {
  fs.writeFileSync(dbFilePath, Buffer.from(database.export()));
};

const queryAll = (sql, params = []) => {
  const statement = database.prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
};

const queryOne = (sql, params = []) => queryAll(sql, params)[0] || null;

const run = (sql, params = []) => {
  database.run(sql, params);
  if (!inTransaction) {
    persist();
  }
};

const transaction = (callback) => {
  database.run("BEGIN TRANSACTION");
  try {
    inTransaction = true;
    const result = callback();
    inTransaction = false;
    database.run("COMMIT");
    persist();
    return result;
  } catch (error) {
    inTransaction = false;
    database.run("ROLLBACK");
    throw error;
  }
};

const normalizeDate = (value = new Date()) =>
  new Date(value).toISOString().split("T")[0];

const readSchema = () => fs.readFileSync(schemaPath, "utf8");

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

const ensureSchema = () => {
  database.exec(readSchema());
  persist();
};

const ensureSeeded = () => {
  const userCount = queryOne(`SELECT COUNT(*) AS count FROM users`)?.count || 0;
  if (userCount > 0) {
    return;
  }

  transaction(() => {
    for (const user of demoUsers) {
      run(
        `INSERT INTO users (nama, username, email, phone, passwordHash, role, bookingsCount, lastActiveAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          user.nama,
          user.username,
          user.email,
          user.phone,
          bcrypt.hashSync(user.password, 10),
          user.role,
        ],
      );
    }

    const userRow = getUserRowByIdentifier("user");
    if (userRow) {
      run(`INSERT INTO customers (userId, nama, noHp) VALUES (?, ?, ?)`, [
        userRow.userId,
        userRow.nama,
        userRow.phone,
      ]);
    }

    for (const barber of seedBarbers) {
      run(
        `INSERT INTO barbers (nama, username, noHp, isAvailableToday, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          barber.nama,
          barber.username,
          barber.noHp,
          barber.isAvailableToday,
          barber.status,
        ],
      );
    }

    for (const service of seedServices) {
      run(
        `INSERT INTO services (namaService, harga, deskripsi, durasi, isActive)
         VALUES (?, ?, ?, ?, 1)`,
        [service.namaService, service.harga, service.deskripsi, service.durasi],
      );
    }

    const today = normalizeDate();
    const slots = getDailyTimeSlots();
    const activeBarbers = queryAll(
      `SELECT barberId FROM barbers WHERE status = 'aktif'`,
    );
    for (const barber of activeBarbers) {
      for (const slot of slots) {
        run(
          `INSERT INTO schedules (barberId, tanggalJadwal, jamMulai, jamSelesai, status)
           VALUES (?, ?, ?, ?, 'tersedia')`,
          [barber.barberId, today, slot.startTime, slot.endTime],
        );
      }
    }

    const demoBookingDate = today;
    const demoSchedule = queryOne(
      `SELECT s.*, b.nama AS barberName FROM schedules s JOIN barbers b ON b.barberId = s.barberId WHERE s.tanggalJadwal = ? AND s.status = 'tersedia' ORDER BY s.barberId ASC, s.jamMulai ASC LIMIT 1`,
      [demoBookingDate],
    );
    const demoUser = getUserRowByIdentifier("user");
    const demoService = queryOne(
      `SELECT * FROM services WHERE namaService = 'Potong Rambut' LIMIT 1`,
    );
    if (demoUser && demoSchedule && demoService) {
      const customerId = ensureCustomerForUser(demoUser);
      run(
        `INSERT INTO bookings (
          bookingCode, customerId, serviceId, userId, barberId, scheduleId,
          tanggalBooking, jamBooking, nomorAntrian, statusBooking, jenisKedatangan,
          catatan, totalHarga
        ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 1, 'selesai', 'online', ?, ?)`,
        [
          customerId,
          demoService.serviceId,
          demoUser.userId,
          demoSchedule.barberId,
          demoSchedule.scheduleId,
          demoBookingDate,
          demoSchedule.jamMulai,
          null,
          demoService.harga,
        ],
      );
      const bookingId = queryOne(
        `SELECT MAX(bookingId) AS id FROM bookings`,
      )?.id;
      if (bookingId) {
        const bookingCode = `BK-${String(bookingId).padStart(4, "0")}`;
        run(`UPDATE bookings SET bookingCode = ? WHERE bookingId = ?`, [
          bookingCode,
          bookingId,
        ]);
        run(
          `UPDATE schedules SET status = 'penuh', bookingId = ? WHERE scheduleId = ?`,
          [bookingId, demoSchedule.scheduleId],
        );
      }
    }
  });
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

ensureSchema();
ensureSeeded();
ensureSchedulesForDate();

export { database, queryAll, queryOne, run, transaction, normalizeDate };
