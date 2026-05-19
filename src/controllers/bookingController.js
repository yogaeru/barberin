import {
  createUserBooking,
  listCurrentUserBookings,
  getCurrentUserQueueStatus,
  cancelUserBooking,
} from "../services/bookingService.js";

export const getCurrentUserBookings = (req, res) => {
  res.json({ ok: true, bookings: listCurrentUserBookings(req.auth.userId) });
};

export const getCurrentQueue = (req, res) => {
  const queue = getCurrentUserQueueStatus(req.auth.userId);
  res.json({ ok: true, queue });
};

export const cancelBooking = (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const result = cancelUserBooking(req.auth.userId, bookingId);
  if (!result.ok) {
    return res.status(400).json(result);
  }
  res.json(result);
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
    if (req.is("json")) {
      return res.status(400).json(result);
    }
    return res.redirect("/booking?error=" + encodeURIComponent(result.message));
  }

  if (req.is("json")) {
    return res.status(201).json(result);
  }

  res.render("booking-redirect", {
    layout: false,
    booking: result.booking,
  });
};
