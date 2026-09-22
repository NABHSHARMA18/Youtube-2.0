import mongoose from "mongoose";

const downloadSecurity = (req, res, next) => {
  const { userid, videoid } = req.body;

  if (
    !userid ||
    !mongoose.Types.ObjectId.isValid(userid)
  ) {
    return res.status(400).json({
      message: "Please provide a valid user ID.",
    });
  }

  if (
    !videoid ||
    !mongoose.Types.ObjectId.isValid(videoid)
  ) {
    return res.status(400).json({
      message: "Please provide a valid video ID.",
    });
  }

  next();
};

export default downloadSecurity;