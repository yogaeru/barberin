import {
  getBarbersApi,
  getPublicBootstrapApi,
  getSchedulesApi,
  getServicesApi,
} from "../controllers/publicController.js";

const registerPublicApiRoutes = (app) => {
  app.get("/api/services", getServicesApi);
  app.get("/api/barbers", getBarbersApi);
  app.get("/api/schedules", getSchedulesApi);
  app.get("/api/public/bootstrap", getPublicBootstrapApi);
};

export { registerPublicApiRoutes };
