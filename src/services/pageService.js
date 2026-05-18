import { normalizeDate } from "../lib/database.js";
import { getServices } from "./serviceService.js";
import { getAdminBarbers } from "./barberService.js";
import { getScheduleRows } from "./scheduleService.js";

export const getHomePageData = () => ({
  services: getServices(),
});

export const getBookingPageData = (date = normalizeDate()) => ({
  services: getServices(),
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date }),
  date,
});

export const getDashboardPageData = () => ({});

export const getStatusPageData = () => ({});

export const getAboutPageData = () => ({});

export const getLoginPageData = () => ({});

export const getRegisterPageData = () => ({});

export const getForgotPasswordPageData = () => ({});

export const getPublicBootstrapData = (date = normalizeDate()) => ({
  services: getServices(),
  barbers: getAdminBarbers(date),
  schedules: getScheduleRows({ date }),
  date,
});
