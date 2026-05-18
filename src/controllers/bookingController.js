import {
  createUserBooking,
  listCurrentUserBookings,
} from "../services/bookingService.js";

export const getCurrentUserBookings = (req, res) => {
  res.json({ ok: true, bookings: listCurrentUserBookings(req.auth.userId) });
};

export const createBooking = (req, res) => {
  const result = createUserBooking({
    userId: req.auth.userId,
    serviceId: Number(req.body.serviceId),
    barberId: req.body.barberId ? Number(req.body.barberId) : null,
    date: req.body.date,
    time: req.body.time,
    catatan: req.body.catatan,
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
};
