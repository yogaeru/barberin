import { queryAll } from "../lib/database.js";

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

export const listServices = () => getServices();
