 import React, { useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface UserInfo {
  _id: string;
  name?: string;
  image?: string;
  location?: string;
}

interface Comment {
  _id: string;
  videoid: string;
  userid: string | UserInfo;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  edited?: boolean;
  editedAt?: string;
  likes?: string[];
  dislikes?: string[];
  parentComment?: string | null;
  mentions?: string[];
  language?: string;
}

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [loading, setLoading] = useState(true);

  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [targetLanguage, setTargetLanguage] = useState("hi");

  const [sortOption, setSortOption] = useState("newest");

  // CAPTCHA
  const [postAttempts, setPostAttempts] = useState(0);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  // REPORT
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");

  const { user } = useUser();

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.error("LOAD COMMENTS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserId = (comment: Comment) => {
    if (typeof comment.userid === "string") {
      return comment.userid;
    }

    return comment.userid?._id;
  };

  const getProfileImage = (comment: Comment) => {
    if (
      typeof comment.userid !== "string" &&
      comment.userid?.image
    ) {
      return comment.userid.image;
    }

    return "";
  };

  const getLocation = (comment: Comment) => {
    if (
      typeof comment.userid !== "string" &&
      comment.userid?.location
    ) {
      return comment.userid.location;
    }

    return "";
  };

  // ==========================================
  // CAPTCHA
  // ==========================================

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;

    setCaptchaQuestion('${num1} + ${num2} = ?');
    setCaptchaAnswer(String(num1 + num2));
    setCaptchaInput("");
  };

  const checkCaptcha = () => {
    if (captchaInput.trim() !== captchaAnswer) {
      alert("Incorrect CAPTCHA. Please try again.");
      generateCaptcha();
      return false;
    }

    return true;
  };

  const handlePostingAttempt = () => {
    const newAttempts = postAttempts + 1;

    setPostAttempts(newAttempts);

    if (newAttempts >= 3) {
      setCaptchaRequired(true);

      if (!captchaQuestion) {
        generateCaptcha();
      }
    }
  };
// ==========================================
  // POST COMMENT
  // ==========================================

  const postComment = async () => {
    if (!user || !newComment.trim()) {
      return;
    }

    if (captchaRequired) {
      if (!checkCaptcha()) {
        return;
      }
    }

    handlePostingAttempt();

    try {
      const res = await axiosInstance.post(
        "/comment/postcomment",
        {
          videoid: videoId,
          userid: user._id,
          commentbody: newComment.trim(),
          usercommented: user.name,
          parentComment: null,
          mentions: [],
          language: selectedLanguage,
        }
      );

      if (res.data.comment) {
        setNewComment("");
        setPostAttempts(0);
        setCaptchaRequired(false);
        setCaptchaInput("");
        setCaptchaQuestion("");
        setCaptchaAnswer("");

        await loadComments();
      }
    } catch (error: any) {
      console.error("POST COMMENT ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to post comment.";

      alert(message);
    }
  };

  // ==========================================
  // POST REPLY
  // ==========================================

  const postReply = async (parentId: string) => {
    if (!user || !replyText.trim()) {
      return;
    }

    if (captchaRequired) {
      if (!checkCaptcha()) {
        return;
      }
    }

    handlePostingAttempt();

    try {
      const names =
        replyText.match(/@[a-zA-Z0-9_.-]+/g) || [];

      const mentionedIds: string[] = [];

      names.forEach((name) => {
        const username = name.substring(1);

        const found = comments.find(
          (c) =>
            c.usercommented?.toLowerCase() ===
            username.toLowerCase()
        );

        if (found) {
          const id = getUserId(found);

          if (id && !mentionedIds.includes(id)) {
            mentionedIds.push(id);
          }
        }
      });

      const res = await axiosInstance.post(
        "/comment/postcomment",
        {
          videoid: videoId,
          userid: user._id,
          commentbody: replyText.trim(),
          usercommented: user.name,
          parentComment: parentId,
          mentions: mentionedIds,
          language: selectedLanguage,
        }
      );

      if (res.data.comment) {
        setReplyText("");
        setReplyingTo(null);
        setPostAttempts(0);
        setCaptchaRequired(false);
        setCaptchaInput("");
        setCaptchaQuestion("");
        setCaptchaAnswer("");

        await loadComments();
      }
    } catch (error: any) {
      console.error("POST REPLY ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to post reply.";

      alert(message);
    }
  };

  // ==========================================
  // TRANSLATE
  // ==========================================

  const translateComment = async (comment: Comment) => {
    try {
      setTranslatingId(comment._id);

      const res = await axiosInstance.post(
        "/comment/translate",
        {
          text: comment.commentbody,
          targetLanguage: targetLanguage,
        }
      );

      setTranslations((prev) => ({
        ...prev,
        [comment._id]: res.data.translatedText,
      }));
    } catch (error: any) {
      console.error("TRANSLATION ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Translation failed.";

      alert(message);
    } finally {
      setTranslatingId(null);
    }
  };

  // ==========================================
  // EDIT
  // ==========================================

  const updateComment = async () => {
    if (!user ||  !editingId  ||  !editText.trim()) {
      return;
    }

    try {
      await axiosInstance.post(
        '/comment/editcomment/${editingId}',
        {
          commentbody: editText.trim(),
          userid: user._id,
        }
      );

      setEditingId(null);
      setEditText("");
 await loadComments();
    } catch (error: any) {
      console.error("EDIT COMMENT ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to edit comment.";

      alert(message);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const deleteComment = async (id: string) => {
    if (!user) return;

    try {
      await axiosInstance.delete(
        '/comment/deletecomment/${id}',
        {
          data: {
            userid: user._id,
          },
        }
      );

      await loadComments();
    } catch (error: any) {
      console.error("DELETE COMMENT ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to delete comment.";

      alert(message);
    }
  };

  // ==========================================
  // LIKE
  // ==========================================

  const likeComment = async (id: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(
        '/comment/likecomment/${id}',
        {
          userid: user._id,
        }
      );

      await loadComments();
    } catch (error) {
      console.error("LIKE ERROR:", error);
    }
  };

  // ==========================================
  // DISLIKE
  // ==========================================

  const dislikeComment = async (id: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(
        '/comment/dislikecomment/${id}',
        {
          userid: user._id,
        }
      );

      await loadComments();
    } catch (error) {
      console.error("DISLIKE ERROR:", error);
    }
  };

  // ==========================================
  // REPORT COMMENT
  // ==========================================

  const reportComment = async (commentId: string) => {
    if (!user) {
      alert("Please login to report a comment.");
      return;
    }

    try {
      const res = await axiosInstance.post(
        "/report/reportcomment",
        {
          commentid: commentId,
          reportedby: user._id,
          reason: reportReason,
        }
      );

      alert(
        res.data.message ||
          "Comment reported successfully."
      );

      setReportingId(null);
      setReportReason("spam");
    } catch (error: any) {
      console.error("REPORT COMMENT ERROR:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to report comment.";

      alert(message);
    }
  };

  // ==========================================
  // SORT COMMENTS
  // ==========================================

  const getSortedComments = (commentList: Comment[]) => {
    const sorted = [...commentList];

    if (sortOption === "newest") {
      return sorted.sort(
        (a, b) =>
          new Date(b.commentedon).getTime() -
          new Date(a.commentedon).getTime()
      );
    }

    if (sortOption === "oldest") {
      return sorted.sort(
        (a, b) =>
          new Date(a.commentedon).getTime() -
          new Date(b.commentedon).getTime()
      );
    }

    if (sortOption === "mostLiked") {
      return sorted.sort(
        (a, b) =>
          (b.likes?.length || 0) -
          (a.likes?.length || 0)
      );
    }

    if (sortOption === "mostRelevant") {
      return sorted.sort((a, b) => {
        const aLikes = a.likes?.length || 0;
        const aDislikes = a.dislikes?.length || 0;

        const bLikes = b.likes?.length || 0;
        const bDislikes = b.dislikes?.length || 0;

        const aEngagement = aLikes - aDislikes;
        const bEngagement = bLikes - bDislikes;

        const aAge =
          Date.now() -
          new Date(a.commentedon).getTime();

        const bAge =
          Date.now() -
          new Date(b.commentedon).getTime();

        const week = 7 * 24 * 60 * 60 * 1000;

        const aRecency = Math.max(
          0,
          1 - aAge / week
        );

        const bRecency = Math.max(
          0,
          1 - bAge / week
        );
const aScore =
          aEngagement + aRecency;

        const bScore =
          bEngagement + bRecency;

        return bScore - aScore;
      });
    }

    return sorted;
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  // ==========================================
  // RENDER COMMENT
  // ==========================================

  const renderComment = (
    comment: Comment,
    reply = false
  ) => {
    const likes = comment.likes || [];
    const dislikes = comment.dislikes || [];

    const commentUserId = getUserId(comment);

    const isLiked = user
      ? likes.includes(user._id)
      : false;

    const isDisliked = user
      ? dislikes.includes(user._id)
      : false;

    const replies = comments.filter(
      (c) => c.parentComment === comment._id
    );

    const profileImage = getProfileImage(comment);
    const location = getLocation(comment);

    return (
      <div
        key={comment._id}
        className={
          reply
            ? "flex gap-3 ml-10 mt-4"
            : "flex gap-4"
        }
      >
        <Avatar className="w-10 h-10">
          <AvatarImage
            src={profileImage}
            alt={comment.usercommented}
          />

          <AvatarFallback>
            {comment.usercommented?.[0]?.toUpperCase() ||
              "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">

          {/* USER INFO */}
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className="font-medium text-sm">
              {comment.usercommented}
            </span>

            {location && (
              <span className="text-xs text-gray-500">
                📍 {location}
              </span>
            )}

            <span className="text-xs text-gray-500">
              {formatDistanceToNow(
                new Date(comment.commentedon)
              )}{" "}
              ago
            </span>

            {comment.edited && (
              <span className="text-xs text-gray-500">
                (Edited)
              </span>
            )}
          </div>

          {/* LANGUAGE */}
          {comment.language && (
            <div className="text-xs text-gray-400 mb-1">
              Language:{" "}
              {languages.find(
                (lang) =>
                  lang.code === comment.language
              )?.name ||
                comment.language}
            </div>
          )}

          {/* EDIT */}
          {editingId === comment._id ? (
            <div className="space-y-2">

              <Textarea
                value={editText}
                onChange={(e) =>
                  setEditText(e.target.value)
                }
                autoFocus
              />

              <div className="flex gap-2">

                <Button
                  type="button"
                  onClick={updateComment}
                  disabled={!editText.trim()}
                >
                  Save
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setEditText("");
                  }}
                >
                  Cancel
                </Button>

              </div>
            </div>
          ) : (
            <>
              {/* COMMENT TEXT */}
              <p className="text-sm">
                {comment.commentbody}
              </p>

              {/* TRANSLATION */}
              {translations[comment._id] && (
                <div className="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800">

                  <div className="text-xs text-gray-500 mb-1">
                    Translation:
                  </div>

                  <p className="text-sm">
                    {translations[comment._id]}
                  </p>

                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
 <button
                  type="button"
                  onClick={() =>
                    likeComment(comment._id)
                  }
                  className={
                    isLiked ? "font-bold" : ""
                  }
                >
                  👍 {likes.length}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    dislikeComment(comment._id)
                  }
                  className={
                    isDisliked ? "font-bold" : ""
                  }
                >
                  👎 {dislikes.length}
                </button>

                {!reply && user && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(comment._id);
                      setReplyText(
                        '@${comment.usercommented}' 
                      );
                    }}
                  >
                    Reply
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    translateComment(comment)
                  }
                  disabled={
                    translatingId === comment._id
                  }
                  className="font-medium"
                >
                  {translatingId === comment._id
                    ? "Translating..."
                    : "Translate"}
                </button>

                {/* REPORT */}
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportingId(comment._id);
                      setReportReason("spam");
                    }}
                  >
                    Report
                  </button>
                )}

              </div>

              {/* TRANSLATE LANGUAGE */}
              <div className="mt-2">
                <select
                  value={targetLanguage}
                  onChange={(e) =>
                    setTargetLanguage(e.target.value)
                  }
                  className="text-xs border rounded px-2 py-1 bg-background"
                >
                  {languages.map((language) => (
                    <option
                      key={language.code}
                      value={language.code}
                    >
                      Translate to {language.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* REPORT FORM */}
              {reportingId === comment._id && (
                <div className="mt-3 border rounded-lg p-3 space-y-2">

                  <p className="text-sm font-medium">
                    Report this comment
                  </p>

                  <select
                    value={reportReason}
                    onChange={(e) =>
                      setReportReason(e.target.value)
                    }
                    className="text-sm border rounded px-3 py-2 bg-background"
                  >
                    <option value="spam">
                      Spam
                    </option>

                    <option value="harassment">
                      Harassment
                    </option>

                    <option value="offensive">
                      Offensive Content
                    </option>
                  </select>

                  <div className="flex gap-2">

                    <Button
                      type="button"
                      onClick={() =>
                        reportComment(comment._id)
                      }
                    >
                      Submit Report
                    </Button>
<Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setReportingId(null)
                      }
                    >
                      Cancel
                    </Button>

                  </div>
                </div>
              )}

              {/* EDIT / DELETE */}
              {user &&
                commentUserId === user._id && (
                  <div className="flex gap-3 mt-2 text-sm text-gray-500">

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditText(
                          comment.commentbody
                        );
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteComment(comment._id)
                      }
                    >
                      Delete
                    </button>

                  </div>
                )}

              {/* REPLY BOX */}
              {replyingTo === comment._id && (
                <div className="mt-3 space-y-2">

                  <Textarea
                    value={replyText}
                    onChange={(e) =>
                      setReplyText(e.target.value)
                    }
                    placeholder="Write a reply..."
                    autoFocus
                  />

                  <div className="flex gap-2">

                    <Button
                      type="button"
                      onClick={() =>
                        postReply(comment._id)
                      }
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </Button>

                  </div>
                </div>
              )}

              {/* REPLIES */}
              {replies.length > 0 && (
                <div>
                  {replies.map((r) =>
                    renderComment(r, true)
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    );
  };

  const mainComments = comments.filter(
    (c) => !c.parentComment
  );

  const sortedMainComments =
    getSortedComments(mainComments);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3">

        <h2 className="text-xl font-semibold">
          {comments.length} Comments
        </h2>

        {mainComments.length > 0 && (
          <select
            value={sortOption}
            onChange={(e) =>
              setSortOption(e.target.value)
            }
            className="text-sm border rounded px-3 py-2 bg-background"
          >
            <option value="newest">
              Newest
            </option>

            <option value="oldest">
              Oldest
            </option>

            <option value="mostLiked">
              Most Liked
            </option>

            <option value="mostRelevant">
              Most Relevant
            </option>
          </select>
        )}

      </div>

      {/* NEW COMMENT */}
      {user && (
        <div className="flex gap-4">

          <Avatar className="w-10 h-10">

            <AvatarImage
              src={user.image || ""}
              alt={user.name || "User"}
            />

            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>

          </Avatar>
 <div className="flex-1 space-y-2">

            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) =>
                setNewComment(e.target.value)
              }
            />

            {/* COMMENT LANGUAGE */}
            <div>
              <select
                value={selectedLanguage}
                onChange={(e) =>
                  setSelectedLanguage(e.target.value)
                }
                className="text-sm border rounded px-3 py-2 bg-background"
              >
                {languages.map((language) => (
                  <option
                    key={language.code}
                    value={language.code}
                  >
                    Comment language:{" "}
                    {language.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CAPTCHA */}
            {captchaRequired && (
              <div className="border rounded-lg p-3 space-y-2">

                <p className="text-sm font-medium">
                  CAPTCHA verification required
                </p>

                <p className="text-sm">
                  Solve:{" "}
                  <strong>
                    {captchaQuestion}
                  </strong>
                </p>

                <div className="flex flex-wrap gap-2">

                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) =>
                      setCaptchaInput(e.target.value)
                    }
                    placeholder="Enter answer"
                    className="border rounded px-3 py-2 text-sm bg-background"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCaptcha}
                  >
                    New CAPTCHA
                  </Button>

                </div>

              </div>
            )}

            {/* COMMENT BUTTON */}
            <div className="flex justify-end">

              <Button
                type="button"
                onClick={postComment}
                disabled={!newComment.trim()}
              >
                Comment
              </Button>

            </div>

          </div>
        </div>
      )}

      {/* COMMENTS */}
      <div className="space-y-5">

        {mainComments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          sortedMainComments.map((comment) =>
            renderComment(comment)
          )
        )}

      </div>

    </div>
  );
};

export default Comments;