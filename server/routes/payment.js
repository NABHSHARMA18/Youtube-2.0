import express from "express";

import {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
} from "../controllers/payment.js";

const routes =
  express.Router();

routes.post(
  "/create-order",
  createPaymentOrder
);

routes.post(
  "/verify",
  verifyPayment
);

routes.post(
  "/failed",
  markPaymentFailed
);

export default routes;