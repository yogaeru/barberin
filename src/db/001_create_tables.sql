-- ============================================================
-- BarberSync - Database Migration
-- ERD: Chen Notation (Customer, User, Barber, Service, 
--       Booking, Schedule, Payment, Notification)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. USER  (login / auth)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    userId      INTEGER PRIMARY KEY AUTOINCREMENT,
    nama        TEXT    NOT NULL,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    UNIQUE,
    phone       TEXT,
    passwordHash TEXT   NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('user', 'admin', 'barber'))
                        DEFAULT 'user',
    bookingsCount INTEGER NOT NULL DEFAULT 0,
    lastActiveAt DATETIME,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. CUSTOMER  (data profil pelanggan, berelasi 1-1 ke User)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    customerId  INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL UNIQUE
                        REFERENCES users(userId) ON DELETE CASCADE,
    nama        TEXT    NOT NULL,
    noHp        TEXT,
    catatan     TEXT,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. BARBER
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barbers (
    barberId    INTEGER PRIMARY KEY AUTOINCREMENT,
    nama        TEXT    NOT NULL,
    username    TEXT    UNIQUE,
    noHp        TEXT,
    isAvailableToday INTEGER NOT NULL DEFAULT 1 CHECK(isAvailableToday IN (0, 1)),
    status      TEXT    NOT NULL CHECK(status IN ('aktif', 'nonaktif'))
                        DEFAULT 'aktif',
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 4. SERVICE  (layanan / paket potong)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    serviceId   INTEGER PRIMARY KEY AUTOINCREMENT,
    namaService TEXT    NOT NULL,
    harga       REAL    NOT NULL,
    deskripsi   TEXT,
    durasi      INTEGER NOT NULL,
    isActive    INTEGER NOT NULL DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 5. SCHEDULE  (jadwal barber; N barber : 1 schedule per slot)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    scheduleId  INTEGER PRIMARY KEY AUTOINCREMENT,
    barberId    INTEGER NOT NULL
                        REFERENCES barbers(barberId) ON DELETE CASCADE,
    tanggalJadwal DATE  NOT NULL,
    jamMulai    TIME    NOT NULL,
    jamSelesai  TIME    NOT NULL,
    status      TEXT    NOT NULL CHECK(status IN ('tersedia', 'penuh', 'libur'))
                        DEFAULT 'tersedia',
    bookingId   INTEGER REFERENCES bookings(bookingId) ON DELETE SET NULL,
    createdByUserId INTEGER REFERENCES users(userId) ON DELETE SET NULL,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(barberId, tanggalJadwal, jamMulai)
);

-- ------------------------------------------------------------
-- 6. BOOKING  (inti transaksi)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    bookingId       INTEGER PRIMARY KEY AUTOINCREMENT,
    bookingCode     TEXT    UNIQUE,
    customerId      INTEGER NOT NULL
                            REFERENCES customers(customerId),
    serviceId       INTEGER NOT NULL
                            REFERENCES services(serviceId),
    userId          INTEGER NOT NULL              -- operator / user yang mengelola
                            REFERENCES users(userId),
    barberId        INTEGER
                            REFERENCES barbers(barberId),
    scheduleId      INTEGER
                            REFERENCES schedules(scheduleId),
    tanggalBooking  DATE    NOT NULL,
    jamBooking      TIME    NOT NULL,
    nomorAntrian    INTEGER,
    statusBooking   TEXT    NOT NULL
                            CHECK(statusBooking IN (
                                'menunggu','dikonfirmasi','dalam_proses',
                                'selesai','dibatalkan'))
                            DEFAULT 'menunggu',
    jenisKedatangan TEXT    NOT NULL
                            CHECK(jenisKedatangan IN ('online', 'walk-in'))
                            DEFAULT 'online',
    catatan         TEXT,
    totalHarga      REAL    NOT NULL DEFAULT 0,
    createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 7. PAYMENT  (1 booking : 1 payment)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    paymentId           INTEGER PRIMARY KEY AUTOINCREMENT,
    bookingId           INTEGER NOT NULL UNIQUE
                                REFERENCES bookings(bookingId) ON DELETE CASCADE,
    jumlahBayar         REAL    NOT NULL,
    metodePembayaran    TEXT    NOT NULL
                                CHECK(metodePembayaran IN (
                                    'tunai','transfer','qris','ewallet')),
    statusPembayaran    TEXT    NOT NULL
                                CHECK(statusPembayaran IN (
                                    'belum_bayar','sudah_bayar','dikembalikan'))
                                DEFAULT 'belum_bayar',
    referenceNumber     TEXT,
    notes               TEXT,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 8. NOTIFICATION  (N notif : 1 user; N notif : 1 booking)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notifId     INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL
                        REFERENCES users(userId) ON DELETE CASCADE,
    bookingId   INTEGER
                        REFERENCES bookings(bookingId) ON DELETE SET NULL,
    pesan       TEXT    NOT NULL,
    tipe        TEXT    NOT NULL
                        CHECK(tipe IN (
                            'booking_baru','status_update',
                            'pengingat','pembayaran','sistem')),
    isRead      INTEGER NOT NULL DEFAULT 0 CHECK(isRead IN (0, 1)),
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Indexes untuk query umum
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_customer  ON bookings(customerId);
CREATE INDEX IF NOT EXISTS idx_bookings_service   ON bookings(serviceId);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule  ON bookings(scheduleId);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(statusBooking);
CREATE INDEX IF NOT EXISTS idx_bookings_tanggal   ON bookings(tanggalBooking);
CREATE INDEX IF NOT EXISTS idx_schedules_barber   ON schedules(barberId);
CREATE INDEX IF NOT EXISTS idx_schedules_tanggal  ON schedules(tanggalJadwal);
CREATE INDEX IF NOT EXISTS idx_notif_user         ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notif_booking      ON notifications(bookingId);
CREATE INDEX IF NOT EXISTS idx_payments_booking   ON payments(bookingId);
