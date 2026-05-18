-- ============================================================
-- BarberSync - Database Seeders
-- Seed ini mengikuti schema di `001_create_tables.sql`.
-- Password hash dihasilkan di backend saat bootstrap database.
-- ============================================================

PRAGMA foreign_keys = ON;

INSERT INTO users (nama, username, email, phone, passwordHash, role, bookingsCount, lastActiveAt) VALUES
  ('Admin BarberSync', 'admin', 'admin@barbersync.id', '-', '$2b$10$admin_demo_hash', 'admin', 0, CURRENT_TIMESTAMP),
  ('User BarberSync', 'user', 'user@barbersync.com', '081234567890', '$2b$10$user_demo_hash', 'user', 1, CURRENT_TIMESTAMP),
  ('Operator BarberSync', 'operator', 'operator@barbersync.id', '081200000001', '$2b$10$operator_demo_hash', 'barber', 0, CURRENT_TIMESTAMP);

INSERT INTO customers (userId, nama, noHp) VALUES
  (2, 'User BarberSync', '081234567890');

INSERT INTO barbers (nama, username, noHp, isAvailableToday, status) VALUES
  ('Ahmad Syaiful', 'ahmad', '081300000001', 1, 'aktif'),
  ('Budi Santoso', 'budi', '081300000002', 1, 'aktif'),
  ('Charlie Rahman', 'charlie', '081300000003', 0, 'aktif');

INSERT INTO services (namaService, harga, deskripsi, durasi, isActive) VALUES
  ('Potong Rambut', 50000, 'Potong rambut standar', 30, 1),
  ('Fade Cream', 60000, 'Potongan fade dengan krim', 35, 1),
  ('Beard Trim', 40000, 'Pemangkasan jenggot', 20, 1);
