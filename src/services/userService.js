import bcrypt from "bcryptjs";

import { queryAll, queryOne, run } from "../lib/database.js";

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

export const authenticateUser = (identifier, password) =>
  loginUser(identifier, password);

export const registerAccount = (payload) => registerUser(payload);

export const getUsers = () => getAdminUsers();

export const getAdminUsersData = () => ({
  users: getAdminUsers(),
});

export { getPublicUser, getUserRowByIdentifier, ensureCustomerForUser, roleStyles };
