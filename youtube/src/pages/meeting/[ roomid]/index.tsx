import { useRouter } from "next/router";
import {
  useEffect,
  useState,
} from "react";

import VideoCall from "../../../components/VideoCall";

export default function MeetingRoomPage() {
  const router =
    useRouter();

  const {
    roomId,
  } = router.query;

  const [user, setUser] =
    useState<any>(null);

  const [meeting, setMeeting] =
    useState<any>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          "user"
        );

      if (raw) {
        setUser(
          JSON.parse(raw)
        );
      }
    } catch {
      setError(
        "Unable to read logged-in user."
      );
    }
  }, []);

  useEffect(() => {
    if (
      !roomId ||
      !user?.email
    ) {
      return;
    }

    const base =
      process.env
        .NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:5000";

    fetch(
      `${base}/meetings/${roomId}`
    )
      .then(
        async (
          response
        ) => {
          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Meeting not found."
            );
          }

          setMeeting(
            data.meeting
          );
        }
      )
      .catch(
        (err) =>
          setError(
            err.message
          )
      );
  }, [
    roomId,
    user,
  ]);

  if (!roomId) {
    return (
      <div className="p-8">
        Loading meeting...
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="p-8">
        Please log in first.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-400">
        {error}
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8">
        Loading meeting...
      </div>
    );
  }

  return (
    <VideoCall
      roomId={String(
        roomId
      )}
      userEmail={
        user.email
      }
      userName={
        user.name ||
        user.displayName
      }
      hostEmail={
        meeting.hostEmail
      }
      maxParticipants={
        meeting.maxParticipants
      }
    />
  );
}