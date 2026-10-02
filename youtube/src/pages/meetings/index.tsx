import { useState } from "react";
import { useRouter } from "next/router";

export default function MeetingsPage() {
  const router =
    useRouter();

  const [title, setTitle] =
    useState(
      "My Video Meeting"
    );

  const [
    maxParticipants,
    setMaxParticipants,
  ] = useState(6);

  const [roomId, setRoomId] =
    useState("");

  const [error, setError] =
    useState("");

  const getUser = () => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "user"
        ) || "{}"
      );
    } catch {
      return {};
    }
  };

  const createMeeting =
    async () => {
      setError("");

      const user =
        getUser();

      if (!user.email) {
        setError(
          "Please log in first."
        );

        return;
      }

      try {
        const base =
          process.env
            .NEXT_PUBLIC_BACKEND_URL ||
          "http://localhost:5000";

        const response =
          await fetch(
            `${base}/meetings/create`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                hostEmail:
                  user.email,

                hostName:
                  user.name ||
                  user.displayName ||
                  user.email.split(
                    "@"
                  )[0],

                title,

                maxParticipants,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to create meeting."
          );
        }

        router.push(
          `/meeting/${data.meeting.roomId}`
        );
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to create meeting."
        );
      }
    };

  const joinMeeting =
    () => {
      const clean =
        roomId
          .trim()
          .toUpperCase();

      if (!clean) {
        setError(
          "Enter a room ID."
        );

        return;
      }

      router.push(
        `/meeting/${clean}`
      );
    };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-3xl grid md:grid-cols-2 gap-5">
        <section className="rounded-2xl bg-slate-900 border border-white/10 p-6">
          <h1 className="text-2xl font-bold">
            Create Meeting
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Create a meeting room and share the room ID.
          </p>

          <input
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            className="mt-6 w-full rounded-lg bg-white/10 px-3 py-3 outline-none"
            placeholder="Meeting title"
          />

          <label className="block mt-4 text-sm text-slate-300">
            Maximum participants
          </label>

          <select
            value={
              maxParticipants
            }
            onChange={(e) =>
              setMaxParticipants(
                Number(
                  e.target.value
                )
              )
            }
            className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-3"
          >
            {[
              2,
              3,
              4,
              5,
              6,
              8,
              10,
              12,
            ].map(
              (number) => (
                <option
                  key={
                    number
                  }
                  value={
                    number
                  }
                >
                  {number}
                </option>
              )
            )}
          </select>

          <button
            onClick={
              createMeeting
            }
            className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold"
          >
            Create Meeting
          </button>
        </section>

        <section className="rounded-2xl bg-slate-900 border border-white/10 p-6">
          <h2 className="text-2xl font-bold">
            Join Meeting
          </h2>

          <p className="text-slate-400 text-sm mt-1">
            Enter the room ID shared by the host.
          </p>

          <input
            value={roomId}
            onChange={(e) =>
              setRoomId(
                e.target.value
              )
            }
            className="mt-6 w-full rounded-lg bg-white/10 px-3 py-3 outline-none uppercase"
            placeholder="Room ID"
          />

          <button
            onClick={
              joinMeeting
            }
            className="mt-5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-semibold"
          >
            Join Meeting
          </button>
        </section>

        {error && (
          <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}