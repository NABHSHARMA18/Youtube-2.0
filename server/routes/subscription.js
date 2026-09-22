import express from "express";

import {
  getPlans,
  getMySubscription,
  getSubscriptionHistory,
  getPlanDetails,
  initializeFreeSubscription,
  cancelSubscription,
  renewSubscription,
  prepareSubscriptionChange,
} from "../controllers/subscription.js";

const routes =
  express.Router();

routes.get(
  "/plans",
  getPlans
);

routes.get(
  "/plans/:plan",
  getPlanDetails
);

routes.get(
  "/my/:userid",
  getMySubscription
);

routes.get(
  "/history/:userid",
  getSubscriptionHistory
);

routes.post(
  "/initialize-free",
  initializeFreeSubscription
);

routes.post(
  "/cancel",
  cancelSubscription
);

routes.post(
  "/renew",
  renewSubscription
);

routes.post(
  "/prepare-change",
  prepareSubscriptionChange
);

export default routes;


