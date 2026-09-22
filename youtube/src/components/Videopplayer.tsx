"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import axiosInstance from "@/lib/axiosinstance";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    isPremium?: boolean;
  };
}

export default function Videopplayer({
  video,
}: VideoPlayerProps) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] =
    useState<string>("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [accessGranted, setAccessGranted] =
    useState(false);

  useEffect(() => {
    const checkVideoAccess =
      async () => {
        if (!video?._id) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          /*
            Get currently logged-in
            user's email.

            The existing project stores
            user information in localStorage.
          */

          let email = "";

          try {
            const storedUser =
              localStorage.getItem(
                "user"
              );

            if (storedUser) {
              const parsedUser =
                JSON.parse(
                  storedUser
                );

              email =
                parsedUser?.email ||
                "";
            }
          } catch (storageError) {
            console.log(
              "Unable to read stored user:",
              storageError
            );
          }

          let url =
            `/video/play/${video._id}`;

          if (email) {
            url += `?email=${encodeURIComponent(
              email
            )}`;
          }

          const response =
            await axiosInstance.get(
              url
            );

          if (
            response.data
              ?.accessGranted
          ) {
            setAccessGranted(true);

            const filepath =
              response.data
                ?.video?.filepath;

            if (!filepath) {
              throw new Error(
                "Video file path not found."
              );
            }

            const backendUrl =
              process.env
                .NEXT_PUBLIC_BACKEND_URL;

            setVideoUrl(
              `${backendUrl}/${filepath}`
            );
          }
        } catch (requestError: any) {
          console.error(
            "VIDEO ACCESS ERROR:",
            requestError
          );

          const message =
            requestError?.response
              ?.data?.message ||
            "You do not have access to this video.";

          setError(message);

          setAccessGranted(false);
        } finally {
          setLoading(false);
        }
      };

    checkVideoAccess();
  }, [video?._id]);

  if (loading) {
    return (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white">
        Checking video access...
      </div>
    );
  }

  if (error || !accessGranted) {
    return (
      <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="text-5xl mb-4">
          🔒
        </div>

        <h2 className="text-xl font-semibold mb-2">
          Premium Video
        </h2>

        <p className="text-gray-300 max-w-md">
          {error ||
            "You need an active paid subscription to watch this video."}
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/subscriptions";
          }}
          className="mt-5 px-5 py-2 bg-red-600 rounded-lg hover:bg-red-700"
        >
          View Subscription Plans
        </button>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster="/placeholder.svg?height=480&width=854"
      >
        <source
          src={videoUrl}
          type="video/mp4"
        />

        Your browser does not support
        the video tag.
      </video>
    </div>
  );
}