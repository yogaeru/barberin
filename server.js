import express from "express";
import expressLayouts from "express-ejs-layouts";

import { demoUsers } from "./src/lib/demoCredentials.js";
import { registerAppRoutes } from "./src/routes/index.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", "src/views");

app.use((req, res, next) => {
  res.locals.demoUsers = demoUsers;
  next();
});

registerAppRoutes(app);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
