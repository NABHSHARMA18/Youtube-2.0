const attempts = new Map();

// Maximum 5 comments/replies in 60 seconds
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 1000;

const commentRateLimiter = (req, res, next) => {
  const userid = req.body?.userid;

  // If user is not logged in / userid missing
  if (!userid) {
    return res.status(401).json({
      message: "Please login to comment.",
    });
  }

  const now = Date.now();

  const userData = attempts.get(userid);

  // First request
  if (!userData) {
    attempts.set(userid, {
      count: 1,
      firstRequest: now,
    });

    return next();
  }

  const timePassed = now - userData.firstRequest;

  // New 60-second window
  if (timePassed >= WINDOW_MS) {
    attempts.set(userid, {
      count: 1,
      firstRequest: now,
    });

    return next();
  }

  // Too many requests
  if (userData.count >= MAX_REQUESTS) {
    const remainingSeconds = Math.ceil(
      (WINDOW_MS - timePassed) / 1000
    );

    return res.status(429).json({
      message: `Too many comments. Please wait ${remainingSeconds} seconds before commenting again.`,
    });
  }

  userData.count += 1;

  attempts.set(userid, userData);

  next();
};

export default commentRateLimiter;