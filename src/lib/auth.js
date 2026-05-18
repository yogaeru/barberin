import jwt from "jsonwebtoken";

import { getRequiredEnv } from "./env.js";

const getJwtSecret = () => getRequiredEnv("JWT_SECRET");

const signToken = (user) =>
  jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "7d" },
  );

const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
};

export { getJwtSecret, signToken, verifyToken };
