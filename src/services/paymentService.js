import { queryAll } from "../lib/database.js";
import { formatBookingCode } from "./bookingService.js";

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

export const getAdminOrdersData = () => ({
  orders: getAdminOrders(),
});
