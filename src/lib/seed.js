import { demoUsers } from "./demoCredentials.js";

const seedBarbers = [
  {
    nama: "Ahmad Syaiful",
    username: "ahmad",
    noHp: "081300000001",
    isAvailableToday: 1,
    status: "aktif",
  },
  {
    nama: "Budi Santoso",
    username: "budi",
    noHp: "081300000002",
    isAvailableToday: 1,
    status: "aktif",
  },
  {
    nama: "Charlie Kirk",
    username: "charlie",
    noHp: "081300000003",
    isAvailableToday: 0,
    status: "aktif",
  },
];

const seedServices = [
  {
    namaService: "Potong Rambut",
    harga: 50000,
    deskripsi: "Potong rambut standar",
    durasi: 30,
  },
  {
    namaService: "Fade Cream",
    harga: 60000,
    deskripsi: "Potongan fade dengan krim",
    durasi: 35,
  },
  {
    namaService: "Beard Trim",
    harga: 40000,
    deskripsi: "Pemangkasan jenggot",
    durasi: 20,
  },
];

export { demoUsers, seedBarbers, seedServices };
