import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// ==========================================
// SAFETY HELPERS
// ==========================================

// Basic profanity list
const bannedWords = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "idiot",
  "stupid",
  "moron",
];

// Check abusive/profane words
const containsProfanity = (text) => {
  const lowerText = text.toLowerCase();

  return bannedWords.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });
};

// Check suspicious/malicious links
const containsMaliciousLink = (text) => {
  const urlRegex = /(https?:\/\/|www\.)[^\s]+/gi;

  const urls = text.match(urlRegex);

  if (!urls) return false;

  const suspiciousPatterns = [
    "bit.ly",
    "tinyurl.com",
    "t.me",
    "discord.gg",
    ".exe",
    ".scr",
    ".bat",
    ".cmd",
    "javascript:",
  ];

  return urls.some((url) =>
    suspiciousPatterns.some((pattern) =>
      url.toLowerCase().includes(pattern)
    )
  );
};

// Check excessive repeated characters
const hasRepeatedCharacters = (text) => {
  return /(.)\1{5,}/u.test(text);
};

// Check excessive special characters / emojis
const hasExcessiveSpecialCharacters = (text) => {
  if (text.length < 6) return false;

  const specialCharacters = text.match(
    /[^a-zA-Z0-9\s]/g
  );

  if (!specialCharacters) return false;

  return specialCharacters.length / text.length > 0.5;
};

// Check duplicate comment
const isDuplicateComment = async (
  videoid,
  userid,
  text
) => {
  const normalizedText = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const previousComments = await comment.find({
    videoid,
    userid,
  });

  return previousComments.some((item) => {
    const oldText = item.commentbody
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return oldText === normalizedText;
  });
};

// Check repeated-word spam
const hasSpamPattern = (text) => {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 4) {
    return false;
  }

  const wordCount = {};

  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.values(wordCount).some(
    (count) => count >= 4
  );
};

// Check promotional spam
const hasPromotionalSpam = (text) => {
  const spamWords = [
    "subscribe",
    "sub4sub",
    "follow4follow",
    "free money",
    "click here",
    "buy now",
    "earn money",
    "visit my channel",
    "check my channel",
    "giveaway",
  ];

  const lowerText = text.toLowerCase();

  return spamWords.some((word) =>
    lowerText.includes(word)
  );
};

// ==========================================
// POST COMMENT
// ==========================================

export const postcomment = async (req, res) => {
  const commentdata = req.body;

  try {
    // ------------------------------------------
    // EMPTY COMMENT CHECK
    // ------------------------------------------

    if (
      !commentdata.commentbody ||
      !commentdata.commentbody.trim()
    ) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const text = commentdata.commentbody.trim();

    // ------------------------------------------
    // 1. PROFANITY CHECK
    // ------------------------------------------

    if (containsProfanity(text)) {
      return res.status(400).json({
        message:
          "Comment contains abusive or inappropriate language.",
      });
    }

    // ------------------------------------------
    // 2. MALICIOUS LINK CHECK
    // ------------------------------------------

    if (containsMaliciousLink(text)) {
      return res.status(400).json({
        message:
          "Comment contains a suspicious or malicious link.",
      });
    }

    // ------------------------------------------
    // 3. REPEATED CHARACTER CHECK
    // ------------------------------------------

    if (hasRepeatedCharacters(text)) {
      return res.status(400).json({
        message:
          "Please avoid excessive repeated characters.",
      });
    }

    // ------------------------------------------
    // 4. SPECIAL CHARACTER / EMOJI SPAM
    // ------------------------------------------

    if (hasExcessiveSpecialCharacters(text)) {
      return res.status(400).json({
        message:
          "Comment contains excessive special characters or emojis.",
      });
    }

    // ------------------------------------------
    // 5. DUPLICATE COMMENT CHECK
    // ------------------------------------------

    if (
      commentdata.userid &&
      mongoose.Types.ObjectId.isValid(
        commentdata.userid
      )
    ) {
      const duplicate = await isDuplicateComment(
        commentdata.videoid,
        commentdata.userid,
        text
      );

      if (duplicate) {
        return res.status(400).json({
          message:
            "Duplicate comment detected. Please write something different.",
        });
      }
    }

    // ------------------------------------------
    // 6. REPEATED WORD SPAM CHECK
    // ------------------------------------------

    if (hasSpamPattern(text)) {
      return res.status(400).json({
        message:
          "Spam detected. Please avoid repeatedly using the same words.",
      });
    }

    // ------------------------------------------
    // 7. PROMOTIONAL SPAM CHECK
    // ------------------------------------------

    if (hasPromotionalSpam(text)) {
      return res.status(400).json({
        message:
          "Spam detected. Promotional or repetitive comments are not allowed.",
      });
    }

    // ------------------------------------------
    // CREATE COMMENT
    // ------------------------------------------

    const postcomment = new comment({
      ...commentdata,
      commentbody: text,
      commentedon: new Date(),
      edited: false,
      editedAt: null,
      language: commentdata.language || "en",
    });

    await postcomment.save();

    return res.status(200).json({
      comment: true,
      data: postcomment,
    });
  } catch (error) {
    console.error(
      "POST COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL COMMENTS
// ==========================================

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .populate(
        "userid",
        "name image location"
      )
      .sort({ commentedon: -1 });

    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(
      "GET COMMENTS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// DELETE COMMENT
// ==========================================

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({
      message: "Comment unavailable",
    });
  }

  try {
    const existingComment =
      await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (
      !userid ||
      existingComment.userid.toString() !==
        userid.toString()
    ) {
      return res.status(403).json({
        message:
          "You can only delete your own comment",
      });
    }

    await comment.findByIdAndDelete(_id);

    return res.status(200).json({
      comment: true,
    });
  } catch (error) {
    console.error(
      "DELETE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// EDIT COMMENT
// ==========================================

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({
      message: "Comment unavailable",
    });
  }

  if (
    typeof commentbody !== "string" ||
    !commentbody.trim()
  ) {
    return res.status(400).json({
      message: "Comment cannot be empty",
    });
  }

  try {
    const existingComment =
      await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (
      !userid ||
      existingComment.userid.toString() !==
        userid.toString()
    ) {
      return res.status(403).json({
        message:
          "You can only edit your own comment",
      });
    }

    // ------------------------------------------
    // 15 MINUTE EDIT LIMIT
    // ------------------------------------------

    const timePassed =
      Date.now() -
      new Date(
        existingComment.commentedon
      ).getTime();

    const fifteenMinutes =
      15 * 60 * 1000;

    if (timePassed > fifteenMinutes) {
      return res.status(403).json({
        message:
          "Comment can only be edited within 15 minutes",
      });
    }

    const text = commentbody.trim();

    // ------------------------------------------
    // SAFETY CHECKS FOR EDIT
    // ------------------------------------------

    if (containsProfanity(text)) {
      return res.status(400).json({
        message:
          "Comment contains abusive or inappropriate language.",
      });
    }

    if (containsMaliciousLink(text)) {
      return res.status(400).json({
        message:
          "Comment contains a suspicious or malicious link.",
      });
    }

    if (hasRepeatedCharacters(text)) {
      return res.status(400).json({
        message:
          "Please avoid excessive repeated characters.",
      });
    }

    if (hasExcessiveSpecialCharacters(text)) {
      return res.status(400).json({
        message:
          "Comment contains excessive special characters or emojis.",
      });
    }

    if (hasSpamPattern(text)) {
      return res.status(400).json({
        message:
          "Spam detected. Please avoid repeatedly using the same words.",
      });
    }

    if (hasPromotionalSpam(text)) {
      return res.status(400).json({
        message:
          "Spam detected. Promotional or repetitive comments are not allowed.",
      });
    }

    // ------------------------------------------
    // UPDATE COMMENT
    // ------------------------------------------

    const updatedComment =
      await comment.findByIdAndUpdate(
        _id,
        {
          $set: {
            commentbody: text,
            edited: true,
            editedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    return res.status(200).json(
      updatedComment
    );
  } catch (error) {
    console.error(
      "EDIT COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ==========================================
// LIKE COMMENT
// ==========================================

export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userid)
  ) {
    return res.status(400).json({
      message: "Invalid comment or user ID",
    });
  }

  try {
    const existingComment =
      await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    existingComment.dislikes =
      existingComment.dislikes.filter(
        (userId) =>
          userId.toString() !==
          userid.toString()
      );

    const alreadyLiked =
      existingComment.likes.some(
        (userId) =>
          userId.toString() ===
          userid.toString()
      );

    if (alreadyLiked) {
      existingComment.likes =
        existingComment.likes.filter(
          (userId) =>
            userId.toString() !==
            userid.toString()
        );
    } else {
      existingComment.likes.push(userid);
    }

    await existingComment.save();

    return res.status(200).json({
      likes:
        existingComment.likes.length,
      dislikes:
        existingComment.dislikes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error(
      "LIKE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// DISLIKE COMMENT
// ==========================================

export const dislikecomment = async (
  req,
  res
) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userid)
  ) {
    return res.status(400).json({
      message: "Invalid comment or user ID",
    });
  }

  try {
    const existingComment =
      await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    existingComment.likes =
      existingComment.likes.filter(
        (userId) =>
          userId.toString() !==
          userid.toString()
      );

    const alreadyDisliked =
      existingComment.dislikes.some(
        (userId) =>
          userId.toString() ===
          userid.toString()
      );

    if (alreadyDisliked) {
      existingComment.dislikes =
        existingComment.dislikes.filter(
          (userId) =>
            userId.toString() !==
            userid.toString()
        );
    } else {
      existingComment.dislikes.push(userid);
    }

    await existingComment.save();

    return res.status(200).json({
      likes:
        existingComment.likes.length,
      dislikes:
        existingComment.dislikes.length,
      disliked: !alreadyDisliked,
    });
  } catch (error) {
    console.error(
      "DISLIKE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// TRANSLATE COMMENT
// ==========================================

export const translatecomment = async (
  req,
  res
) => {
  const { text, targetLanguage } =
    req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({
      message:
        "Text and target language are required",
    });
  }

  try {
    const url =
      `https://api.mymemory.translated.net/get?` +
      `q=${encodeURIComponent(text)}` +
      `&langpair=en|${encodeURIComponent(
        targetLanguage
      )}`;

    const response = await fetch(url);
    const data = await response.json();

    if (
      !data.responseData ||
      !data.responseData.translatedText
    ) {
      return res.status(500).json({
        message: "Translation failed",
      });
    }

    return res.status(200).json({
      translatedText:
        data.responseData.translatedText,
    });
  } catch (error) {
    console.error(
      "TRANSLATION ERROR:",
      error
    );

    return res.status(500).json({
      message: "Translation failed",
    });
  }
};