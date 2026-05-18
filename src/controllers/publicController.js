import {
  getAboutPageData,
  getBookingPageData,
  getDashboardPageData,
  getForgotPasswordPageData,
  getHomePageData,
  getLoginPageData,
  getPublicBootstrapData,
  getRegisterPageData,
  getStatusPageData,
  listBarbers,
  listSchedules,
  listServices,
} from "../services/publicService.js";

const render = (res, view, title, currentPage, data = {}) =>
  res.render(view, {
    title,
    currentPage,
    ...data,
  });

export const renderHomePage = (req, res) =>
  render(res, "index", "Beranda", "index", getHomePageData());

export const renderBookingPage = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  render(
    res,
    "booking",
    "Booking Layanan",
    "booking",
    getBookingPageData(date),
  );
};

export const renderStatusPage = (req, res) =>
  render(res, "status", "Status Antrian", "status", getStatusPageData());

export const renderDashboardPage = (req, res) =>
  render(res, "dashboard", "Dashboard", "dashboard", getDashboardPageData());

export const renderLoginPage = (req, res) =>
  render(res, "login", "Masuk", "login", getLoginPageData());

export const renderRegisterPage = (req, res) =>
  render(res, "register", "Daftar", "register", getRegisterPageData());

export const renderForgotPasswordPage = (req, res) =>
  render(
    res,
    "forgot-password",
    "Lupa Kata Sandi",
    "forgot-password",
    getForgotPasswordPageData(),
  );

export const renderAboutPage = (req, res) =>
  render(res, "about", "Profil Saya", "about", getAboutPageData());

export const getServicesApi = (req, res) => {
  res.json({ ok: true, services: listServices() });
};

export const getBarbersApi = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  res.json({ ok: true, barbers: listBarbers(date) });
};

export const getSchedulesApi = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  const barberId = req.query.barberId ? Number(req.query.barberId) : null;
  res.json({
    ok: true,
    schedules: listSchedules({ date, barberId }),
    date: date || undefined,
  });
};

export const getPublicBootstrapApi = (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  res.json({ ok: true, ...getPublicBootstrapData(date) });
};
