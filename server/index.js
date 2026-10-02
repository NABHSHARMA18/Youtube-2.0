import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";

import paymentRoutes from "./routes/payment.js";
import securityRoutes from "./routes/security.js";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import reportRoutes from "./routes/report.js";
import subscriptionRoutes from "./routes/subscription.js";
import downloadRoutes from "./routes/download.js";
import watchProgressRoutes from "./routes/watchProgress.js";
import http from "http";

import {
  Server as SocketIOServer,
} from "socket.io";

import meetingRoutes from "./routes/meeting.js";

import {
  registerVideoCallSocket,
} from "./sockets/index.js";

dotenv.config();

const app = express();


// CORS
app.use(cors());


// JSON body parser
app.use(
  express.json({
    limit: "30mb",
  })
);


// URL encoded body parser
app.use(
  express.urlencoded({
    limit: "30mb",
    extended: true,
  })
);
app.use(
  "/meetings",
  meetingRoutes
);


// Serve uploaded videos
app.use(
  "/uploads",
  express.static(path.join("uploads"))
);


// Root route
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});


// Body parser
app.use(bodyParser.json());


// Existing routes
app.use("/user", userroutes);

app.use("/video", videoroutes);

app.use("/like", likeroutes);

app.use("/watch", watchlaterroutes);

app.use("/history", historyrroutes);

app.use("/comment", commentroutes);

app.use("/report", reportRoutes);


// Subscription routes
app.use(
  "/subscription",
  subscriptionRoutes
);


// Payment routes
app.use(
  "/payment",
  paymentRoutes
);


// Task 4 - Security routes
app.use(
  "/user/security",
  securityRoutes
);


// Task 2 - Download routes
app.use(
  "/download",
  downloadRoutes
);
app.use(
  "/watch-progress",
  watchProgressRoutes
);


// Server port
const PORT =
  process.env.PORT || 5000;


// Start server
const httpServer =
  http.createServer(app);

const io =
  new SocketIOServer(
    httpServer,
    {
      cors: {
        origin:
          process.env.FRONTEND_URL ||
          "http://localhost:3000",

        methods: [
          "GET",
          "POST",
          "PATCH",
        ],
      },
    }
  );

registerVideoCallSocket(io);

httpServer.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);


// MongoDB connection
const DBURL =
  process.env.DB_URL;

mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
  