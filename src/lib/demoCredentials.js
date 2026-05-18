import { getRequiredEnv } from "./env.js";

const demoUsers = [
  {
    username: "admin",
    name: "Admin BarberSync",
    nama: "Admin BarberSync",
    email: "admin@barbersync.id",
    phone: "-",
    role: "admin",
    password: getRequiredEnv("ADMIN_PASSWORD"),
    bookings: 0,
    lastActive: "Baru saja",
    statusLabel: "Staff",
    statusClass: "bg-primary/20 text-primary border-primary/30",
  },
  {
    username: "user",
    name: "User BarberSync",
    nama: "User BarberSync",
    email: "",
    phone: "081234567890",
    role: "user",
    password: getRequiredEnv("USER_PASSWORD"),
    bookings: 0,
    lastActive: "Baru saja",
    statusLabel: "Aktif",
    statusClass: "bg-success/20 text-success border-success/30",
  },
  {
    username: "operator",
    name: "Operator BarberSync",
    nama: "Operator BarberSync",
    email: "operator@barbersync.id",
    phone: "081200000001",
    role: "barber",
    password: getRequiredEnv("OPERATOR_PASSWORD"),
    bookings: 0,
    lastActive: "Baru saja",
    statusLabel: "Aktif",
    statusClass: "bg-success/20 text-success border-success/30",
  },
];

export { demoUsers };
