# BarberSync — Database SQLite

Database lokal untuk aplikasi BarberSync, dibuat berdasarkan **ERD Chen Notation**.

## Struktur File

```
barbersync/
├── barbersync.db                          ← file database SQLite (generated)
├── setup_db.py                            ← script setup utama
└── database/
    ├── migrations/
    │   └── 001_create_tables.sql          ← DDL semua tabel + index
    └── seeders/
        └── 001_seed_data.sql              ← data dummy realistis
```

## Tabel & Relasi

| Tabel           | Deskripsi                                   | Baris seed |
|-----------------|---------------------------------------------|-----------|
| `users`         | Akun login (customer / admin / barber)      | 8         |
| `customers`     | Profil pelanggan (1-1 ke users)             | 5         |
| `barbers`       | Data tukang cukur                           | 5         |
| `services`      | Layanan & harga (potong, fade, dll)         | 10        |
| `schedules`     | Jadwal slot barber per hari & jam           | 21        |
| `bookings`      | Transaksi booking (inti sistem)             | 10        |
| `payments`      | Pembayaran per booking (1-1)                | 10        |
| `notifications` | Notifikasi ke user terkait booking          | 13        |

### Diagram Relasi (ringkas)

```
User ──────────── Customer ─────────────┐
  │                                     │
  │ (mengelola)                    MEMBUAT (1:N)
  │                                     │
  └────────────────────────────────► Booking ◄──── Service  (MENGGUNAKAN N:1)
                                         │
                      MEMPROSES (1:1) ───┼─── TERKAIT (1:N) ──► Schedule ──► Barber
                                         │
                                      Payment
                                         │
                    MERUJUK (N:1) ───────┘
                         │
                   Notification ◄──── User (MENERIMA 1:N)
```

## Cara Pakai

### 1. Setup dari nol
```bash
python setup_db.py
```

### 2. Reset (hapus DB lama, buat ulang)
```bash
python setup_db.py --reset
```

### 3. Hanya migration (tanpa seeder)
```bash
python setup_db.py --migrate-only
```

### 4. Hanya seeder (DB sudah ada)
```bash
python setup_db.py --seed-only
```

### 5. Verifikasi isi DB
```bash
python setup_db.py --verify
```

### 6. Query langsung via CLI
```bash
sqlite3 barbersync.db

# Contoh query
sqlite3 barbersync.db "SELECT b.bookingId, c.nama, s.namaService, b.statusBooking
                        FROM bookings b
                        JOIN customers c ON b.customerId = c.customerId
                        JOIN services  s ON b.serviceId  = s.serviceId;"
```

## Contoh Query Berguna

```sql
-- Antrian aktif hari ini
SELECT b.nomorAntrian, c.nama, s.namaService, b.jamBooking, b.statusBooking
FROM bookings b
JOIN customers c ON b.customerId = c.customerId
JOIN services  s ON b.serviceId  = s.serviceId
WHERE b.tanggalBooking = DATE('now')
  AND b.statusBooking IN ('menunggu','dikonfirmasi','dalam_proses')
ORDER BY b.nomorAntrian;

-- Jadwal barber tersedia hari ini
SELECT ba.nama AS barber, sc.jamMulai, sc.status
FROM schedules sc
JOIN barbers ba ON sc.barberId = ba.barberId
WHERE sc.tanggalJadwal = DATE('now')
  AND sc.status = 'tersedia'
ORDER BY sc.jamMulai;

-- Pendapatan per metode pembayaran
SELECT metodePembayaran, COUNT(*) AS jumlah, SUM(jumlahBayar) AS total
FROM payments
WHERE statusPembayaran = 'sudah_bayar'
GROUP BY metodePembayaran;

-- Notifikasi belum dibaca milik user tertentu
SELECT n.pesan, n.tipe, n.createdAt
FROM notifications n
WHERE n.userId = 1 AND n.isRead = 0
ORDER BY n.createdAt DESC;
```

## Nilai Enum

| Kolom                  | Nilai yang Valid                                              |
|------------------------|--------------------------------------------------------------|
| `users.role`           | `customer`, `admin`, `barber`                                |
| `barbers.status`       | `aktif`, `nonaktif`                                          |
| `schedules.status`     | `tersedia`, `penuh`, `libur`                                 |
| `bookings.statusBooking` | `menunggu`, `dikonfirmasi`, `dalam_proses`, `selesai`, `dibatalkan` |
| `bookings.jenisKedatangan` | `online`, `walk-in`                                     |
| `payments.metodePembayaran` | `tunai`, `transfer`, `qris`, `ewallet`                 |
| `payments.statusPembayaran` | `belum_bayar`, `sudah_bayar`, `dikembalikan`           |
| `notifications.tipe`   | `booking_baru`, `status_update`, `pengingat`, `pembayaran`, `sistem` |
