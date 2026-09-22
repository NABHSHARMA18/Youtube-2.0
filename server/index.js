import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import paymentRoutes from "./routes/payment.js";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import reportRoutes from "./routes/report.js";
import subscriptionRoutes from "./routes/subscription.js";
import downloadRoutes from "./routes/download.js";


dotenv.config();

const app = express();


app.use(cors());


app.use(
  express.json({
    limit: "30mb",
    extended: true,
  })
);


app.use(
  express.urlencoded({
    limit: "30mb",
    extended: true,
  })
);


// Serve uploaded videos
app.use(
  "/uploads",
  express.static(path.join("uploads"))
);


app.get("/", (req, res) => {
  res.send("You tube backend is working");
});


app.use(bodyParser.json());


// Existing routes
app.use("/user", userroutes);

app.use("/video", videoroutes);

app.use("/like", likeroutes);

app.use("/watch", watchlaterroutes);

app.use("/history", historyrroutes);

app.use("/comment", commentroutes);

app.use("/report", reportRoutes);

app.use(
  "/subscription",
  subscriptionRoutes
);
app.use(
  "/payment",
  paymentRoutes
);


// New Task 2 download routes
app.use(
  "/download",
  downloadRoutes
);


const PORT =
  process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(
    `server running on port ${PORT}`
  );
});


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
