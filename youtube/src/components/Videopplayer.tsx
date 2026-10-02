"use client";

import {
  useCallback,
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
    subtitlefilepath?: string;

    // Day 5 optional fields
    quality?: string;
    videoQuality?: string;
    resolution?: string;

    // Next video support
    nextVideoId?: string;
    nextVideoUrl?: string;
    nextVideoTitle?: string;
  };
}

interface HoverPreview {
  visible: boolean;
  x: number;
  time: number;
}

export default function Videopplayer({
  video,
}: VideoPlayerProps) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const previewVideoRef =
    useRef<HTMLVideoElement>(null);

  const playerRef =
    useRef<HTMLDivElement>(null);

  const progressBarRef =
    useRef<HTMLDivElement>(null);

  const progressSaveTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const controlsTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const resumeMessageTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const countdownTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const [videoUrl, setVideoUrl] =
    useState("");

  const [subtitleUrl, setSubtitleUrl] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [buffering, setBuffering] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accessGranted, setAccessGranted] =
    useState(false);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [bufferedPercent, setBufferedPercent] =
    useState(0);

  const [volume, setVolume] =
    useState(1);

  const [isMuted, setIsMuted] =
    useState(false);

  const [playbackRate, setPlaybackRate] =
    useState(1);

  const [showSpeedMenu, setShowSpeedMenu] =
    useState(false);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const [isTheaterMode, setIsTheaterMode] =
    useState(false);

  const [isPiP, setIsPiP] =
    useState(false);

  const [hasSubtitles, setHasSubtitles] =
    useState(false);

  const [subtitlesEnabled, setSubtitlesEnabled] =
    useState(false);

  const [showControls, setShowControls] =
    useState(true);

  const [hoverPreview, setHoverPreview] =
    useState<HoverPreview>({
      visible: false,
      x: 0,
      time: 0,
    });

  const [previewReady, setPreviewReady] =
    useState(false);

  const [watchedPercent, setWatchedPercent] =
    useState(0);

  const [completed, setCompleted] =
    useState(false);

  const [resumeMessage, setResumeMessage] =
    useState("");

  const [isSavingProgress, setIsSavingProgress] =
    useState(false);

  // =========================================
  // DAY 5 - NEXT VIDEO
  // =========================================

  const [showNextVideoCountdown, setShowNextVideoCountdown] =
    useState(false);

  const [nextVideoCountdown, setNextVideoCountdown] =
    useState(10);

  const [nextVideoCancelled, setNextVideoCancelled] =
    useState(false);

  // =========================================
  // DAY 5 - QUALITY
  // =========================================

  const [videoQuality, setVideoQuality] =
    useState("Auto");

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "";

  // =========================================
  // GET USER EMAIL
  // =========================================

  const getUserEmail = useCallback(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (!storedUser) {
        return "";
      }

      const parsedUser =
        JSON.parse(storedUser);

      return parsedUser?.email || "";
    } catch (error) {
      console.error(
        "USER EMAIL ERROR:",
        error
      );

      return "";
    }
  }, []);

  // =========================================
  // CHECK VIDEO ACCESS
  // =========================================

  useEffect(() => {
    const checkVideoAccess =
      async () => {
        if (!video?._id) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          const email =
            getUserEmail();

          let url =
            `/video/play/${video._id}`;

          if (email) {
            url +=
              `?email=${encodeURIComponent(
                email
              )}`;
          }

          const response =
            await axiosInstance.get(url);

          if (
            response.data?.accessGranted
          ) {
            setAccessGranted(true);

            const videoData =
              response.data?.video;

            const filepath =
              videoData?.filepath ||
              video.filepath;

            if (!filepath) {
              throw new Error(
                "Video file path not found."
              );
            }

            setVideoUrl(
              `${backendUrl}/${filepath}`
            );

            // =================================
            // QUALITY INFORMATION
            // =================================

            const detectedQuality =
              videoData?.quality ||
              videoData?.videoQuality ||
              videoData?.resolution ||
              video?.quality ||
              video?.videoQuality ||
              video?.resolution ||
              "Auto";

            setVideoQuality(
              String(
                detectedQuality
              )
            );

            // =================================
            // SUBTITLES
            // =================================

            const subtitlePath =
              videoData?.subtitlefilepath ||
              video?.subtitlefilepath ||
              "";

            if (subtitlePath) {
              setSubtitleUrl(
                `${backendUrl}/${subtitlePath}`
              );
            } else {
              setSubtitleUrl("");
            }
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
  }, [
    video?._id,
    video?.filepath,
    video?.quality,
    video?.videoQuality,
    video?.resolution,
    video?.subtitlefilepath,
    backendUrl,
    getUserEmail,
  ]);

  // =========================================
  // FORMAT TIME
  // =========================================

  const formatTime = (
    seconds: number
  ) => {
    if (
      !Number.isFinite(seconds) ||
      seconds < 0
    ) {
      return "00:00";
    }

    const hrs =
      Math.floor(seconds / 3600);

    const mins =
      Math.floor(
        (seconds % 3600) / 60
      );

    const secs =
      Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${String(hrs).padStart(
        2,
        "0"
      )}:${String(mins).padStart(
        2,
        "0"
      )}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  // =========================================
  // NEXT VIDEO AVAILABLE?
  // =========================================

  const hasNextVideo =
    Boolean(
      video?.nextVideoUrl ||
      video?.nextVideoId
    );

  // =========================================
  // NAVIGATE NEXT VIDEO
  // =========================================

  const goToNextVideo =
    useCallback(() => {
      if (!hasNextVideo) {
        return;
      }

      setShowNextVideoCountdown(false);

      if (
        video?.nextVideoUrl
      ) {
        window.location.href =
          video.nextVideoUrl;

        return;
      }

      if (
        video?.nextVideoId
      ) {
        window.location.href =
          `/watch/${video.nextVideoId}`;
      }
    }, [
      hasNextVideo,
      video?.nextVideoId,
      video?.nextVideoUrl,
    ]);

  // =========================================
  // CANCEL NEXT VIDEO
  // =========================================

  const cancelNextVideo =
    useCallback(() => {
      setNextVideoCancelled(true);
      setShowNextVideoCountdown(false);

      if (
        countdownTimerRef.current
      ) {
        clearInterval(
          countdownTimerRef.current
        );

        countdownTimerRef.current =
          null;
      }
    }, []);

  // =========================================
  // START NEXT VIDEO COUNTDOWN
  // =========================================

  const startNextVideoCountdown =
    useCallback(() => {
      if (!hasNextVideo) {
        return;
      }

      setNextVideoCancelled(false);
      setNextVideoCountdown(10);
      setShowNextVideoCountdown(true);

      if (
        countdownTimerRef.current
      ) {
        clearInterval(
          countdownTimerRef.current
        );
      }

      countdownTimerRef.current =
        setInterval(() => {
          setNextVideoCountdown(
            (previous) => {
              if (previous <= 1) {
                if (
                  countdownTimerRef.current
                ) {
                  clearInterval(
                    countdownTimerRef.current
                  );

                  countdownTimerRef.current =
                    null;
                }

                setShowNextVideoCountdown(
                  false
                );

                setTimeout(() => {
                  goToNextVideo();
                }, 0);

                return 0;
              }

              return previous - 1;
            }
          );
        }, 1000);
    }, [
      goToNextVideo,
      hasNextVideo,
    ]);

  // =========================================
  // SHOW CONTROLS
  // =========================================

  const showPlayerControls =
    useCallback(() => {
      setShowControls(true);

      if (
        controlsTimerRef.current
      ) {
        clearTimeout(
          controlsTimerRef.current
        );
      }

      if (isPlaying) {
        controlsTimerRef.current =
          setTimeout(() => {
            setShowControls(false);
          }, 3000);
      }
    }, [isPlaying]);

  // =========================================
  // SAVE WATCH PROGRESS
  // =========================================

  const saveProgress =
    useCallback(
      async (
        useBeacon = false
      ) => {
        const player =
          videoRef.current;

        if (!player) {
          return;
        }

        const email =
          getUserEmail();

        if (!email) {
          return;
        }

        const watched =
          player.currentTime || 0;

        const total =
          player.duration || 0;

        if (
          !Number.isFinite(total) ||
          total <= 0
        ) {
          return;
        }

        const progress =
          Math.min(
            (watched / total) * 100,
            100
          );

        setWatchedPercent(
          progress
        );

        const payload = {
          email,
          watchedSeconds:
            watched,
          duration: total,
        };

        if (useBeacon) {
          try {
            const url =
              `${backendUrl}/watch-progress/${video._id}`;

            const blob =
              new Blob(
                [
                  JSON.stringify(
                    payload
                  ),
                ],
                {
                  type:
                    "application/json",
                }
              );

            const sent =
              navigator.sendBeacon(
                url,
                blob
              );

            if (sent) {
              return;
            }
          } catch (error) {
            console.error(
              "BEACON SAVE ERROR:",
              error
            );
          }
        }

        try {
          setIsSavingProgress(true);

          const response =
            await axiosInstance.put(
              `/watch-progress/${video._id}`,
              payload
            );

          if (
            response.data?.progress
          ) {
            setWatchedPercent(
              response.data
                .progress
                .progressPercent ??
                progress
            );

            setCompleted(
              response.data
                .progress
                .completed ??
                false
            );
          }
        } catch (error) {
          console.error(
            "SAVE WATCH PROGRESS ERROR:",
            error
          );
        } finally {
          setIsSavingProgress(false);
        }
      },
      [
        backendUrl,
        getUserEmail,
        video?._id,
      ]
    );

  // =========================================
  // LOAD SAVED PROGRESS
  // =========================================

  const loadSavedProgress =
    useCallback(async () => {
      const email =
        getUserEmail();

      if (
        !email ||
        !video?._id
      ) {
        return;
      }

      try {
        const response =
          await axiosInstance.get(
            `/watch-progress/${video._id}?email=${encodeURIComponent(
              email
            )}`
          );

        const saved =
          response.data?.progress;

        if (!saved) {
          return;
        }

        setWatchedPercent(
          saved.progressPercent ||
            0
        );

        setCompleted(
          saved.completed ||
            false
        );

        const player =
          videoRef.current;

        if (
          player &&
          saved.watchedSeconds > 5 &&
          Number.isFinite(
            saved.watchedSeconds
          )
        ) {
          const resumeTime =
            Math.min(
              saved.watchedSeconds,
              player.duration ||
                saved.duration ||
                saved.watchedSeconds
            );

          player.currentTime =
            resumeTime;

          setCurrentTime(
            resumeTime
          );

          setResumeMessage(
            `Resumed from ${formatTime(
              resumeTime
            )}`
          );

          if (
            resumeMessageTimerRef.current
          ) {
            clearTimeout(
              resumeMessageTimerRef.current
            );
          }

          resumeMessageTimerRef.current =
            setTimeout(() => {
              setResumeMessage("");
            }, 4000);
        }
      } catch (error) {
        console.error(
          "LOAD WATCH PROGRESS ERROR:",
          error
        );
      }
    }, [
      getUserEmail,
      video?._id,
    ]);

  // =========================================
  // METADATA
  // =========================================

  const handleLoadedMetadata =
    async () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      setDuration(
        player.duration || 0
      );

      player.volume =
        volume;

      await loadSavedProgress();
    };

  // =========================================
  // PLAY / PAUSE
  // =========================================

  const togglePlay =
    async () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      try {
        if (player.paused) {
          await player.play();
        } else {
          player.pause();
        }
      } catch (error) {
        console.error(
          "PLAY ERROR:",
          error
        );
      }

      showPlayerControls();
    };

  // =========================================
  // TIME UPDATE
  // =========================================

  const handleTimeUpdate =
    () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      setCurrentTime(
        player.currentTime
      );

      if (
        player.duration &&
        Number.isFinite(
          player.duration
        )
      ) {
        const percent =
          (player.currentTime /
            player.duration) *
          100;

        setWatchedPercent(
          Math.min(
            percent,
            100
          )
        );
      }
    };

  // =========================================
  // BUFFER UPDATE
  // =========================================

  const updateBuffered =
    () => {
      const player =
        videoRef.current;

      if (
        !player ||
        !player.duration ||
        player.buffered.length === 0
      ) {
        return;
      }

      try {
        const bufferedEnd =
          player.buffered.end(
            player.buffered.length - 1
          );

        const percent =
          (bufferedEnd /
            player.duration) *
          100;

        setBufferedPercent(
          Math.min(
            percent,
            100
          )
        );
      } catch (error) {
        console.error(
          "BUFFER UPDATE ERROR:",
          error
        );
      }
    };

  // =========================================
  // PLAY
  // =========================================

  const handlePlay =
    () => {
      setIsPlaying(true);

      setShowNextVideoCountdown(
        false
      );

      showPlayerControls();

      window.dispatchEvent(
        new CustomEvent(
          "custom-video-play",
          {
            detail: {
              videoId:
                video._id,
            },
          }
        )
      );
    };

  // =========================================
  // PAUSE
  // =========================================

  const handlePause =
    () => {
      setIsPlaying(false);
      setShowControls(true);

      saveProgress();
    };

  // =========================================
  // VIDEO ENDED
  // =========================================

  const handleEnded =
    async () => {
      setIsPlaying(false);
      setShowControls(true);

      setWatchedPercent(100);

      await saveProgress();

      // Day 5
      startNextVideoCountdown();
    };

  // =========================================
  // BUFFERING
  // =========================================

  const handleWaiting =
    () => {
      setBuffering(true);
      setShowControls(true);
    };

  const handleCanPlay =
    () => {
      setBuffering(false);
    };

  const handlePlaying =
    () => {
      setBuffering(false);
    };

  // =========================================
  // PERIODIC PROGRESS SAVE
  // =========================================

  useEffect(() => {
    if (!videoUrl) {
      return;
    }

    progressSaveTimerRef.current =
      setInterval(() => {
        if (
          videoRef.current &&
          !videoRef.current.paused
        ) {
          saveProgress();
        }
      }, 10000);

    return () => {
      if (
        progressSaveTimerRef.current
      ) {
        clearInterval(
          progressSaveTimerRef.current
        );
      }
    };
  }, [
    videoUrl,
    saveProgress,
  ]);

  // =========================================
  // BEFORE UNLOAD
  // =========================================

  useEffect(() => {
    const handleBeforeUnload =
      () => {
        saveProgress(true);
      };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [saveProgress]);

  // =========================================
  // MULTIPLE VIDEO PROTECTION
  // =========================================

  useEffect(() => {
    const handleOtherVideo =
      (event: Event) => {
        const customEvent =
          event as CustomEvent;

        const playingVideoId =
          customEvent.detail
            ?.videoId;

        if (
          playingVideoId !==
          video._id
        ) {
          const player =
            videoRef.current;

          if (
            player &&
            !player.paused
          ) {
            player.pause();
          }
        }
      };

    window.addEventListener(
      "custom-video-play",
      handleOtherVideo
    );

    return () => {
      window.removeEventListener(
        "custom-video-play",
        handleOtherVideo
      );
    };
  }, [video?._id]);

  // =========================================
  // VOLUME
  // =========================================

  const handleVolumeChange =
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const newVolume =
        Number(event.target.value);

      const player =
        videoRef.current;

      setVolume(newVolume);

      if (player) {
        player.volume =
          newVolume;

        player.muted =
          newVolume === 0;
      }

      setIsMuted(
        newVolume === 0
      );

      showPlayerControls();
    };

  // =========================================
  // MUTE
  // =========================================

  const toggleMute =
    () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      if (player.muted) {
        player.muted = false;

        const restoredVolume =
          volume === 0
            ? 1
            : volume;

        player.volume =
          restoredVolume;

        setVolume(
          restoredVolume
        );

        setIsMuted(false);
      } else {
        player.muted = true;
        setIsMuted(true);
      }

      showPlayerControls();
    };

  // =========================================
  // SEEK
  // =========================================

  const seekBy =
    (seconds: number) => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      player.currentTime =
        Math.max(
          0,
          Math.min(
            player.duration || 0,
            player.currentTime +
              seconds
          )
        );

      showPlayerControls();
    };

  // =========================================
  // TIMELINE CLICK
  // =========================================

  const seekFromTimeline =
    (
      event: React.MouseEvent<HTMLDivElement>
    ) => {
      const bar =
        progressBarRef.current;

      const player =
        videoRef.current;

      if (!bar || !player) {
        return;
      }

      const rect =
        bar.getBoundingClientRect();

      const clickPosition =
        event.clientX -
        rect.left;

      const percentage =
        Math.max(
          0,
          Math.min(
            1,
            clickPosition /
              rect.width
          )
        );

      player.currentTime =
        percentage *
        player.duration;

      showPlayerControls();
    };

  // =========================================
  // HOVER PREVIEW
  // =========================================

  const handleTimelineHover =
    (
      event: React.MouseEvent<HTMLDivElement>
    ) => {
      const bar =
        progressBarRef.current;

      if (
        !bar ||
        !duration ||
        !previewVideoRef.current
      ) {
        return;
      }

      const rect =
        bar.getBoundingClientRect();

      let x =
        event.clientX -
        rect.left;

      x =
        Math.max(
          0,
          Math.min(
            rect.width,
            x
          )
        );

      const percentage =
        x / rect.width;

      const previewTime =
        percentage *
        duration;

      setHoverPreview({
        visible: true,
        x,
        time: previewTime,
      });

      setPreviewReady(false);

      try {
        previewVideoRef.current.currentTime =
          previewTime;
      } catch (error) {
        console.error(
          "PREVIEW SEEK ERROR:",
          error
        );
      }
    };

  const hideTimelinePreview =
    () => {
      setHoverPreview(
        (previous) => ({
          ...previous,
          visible: false,
        })
      );

      setPreviewReady(false);
    };

  const handlePreviewLoaded =
    () => {
      setPreviewReady(true);
    };

  // =========================================
  // SPEED
  // =========================================

  const changePlaybackSpeed =
    (speed: number) => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      player.playbackRate =
        speed;

      setPlaybackRate(speed);
      setShowSpeedMenu(false);

      showPlayerControls();
    };

  // =========================================
  // FULLSCREEN
  // =========================================

  const toggleFullscreen =
    async () => {
      const player =
        playerRef.current;

      if (!player) {
        return;
      }

      try {
        if (
          !document.fullscreenElement
        ) {
          await player.requestFullscreen();
          setIsFullscreen(true);
        } else {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error(
          "FULLSCREEN ERROR:",
          error
        );
      }

      showPlayerControls();
    };

  // =========================================
  // FULLSCREEN CHANGE
  // =========================================

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setIsFullscreen(
          Boolean(
            document.fullscreenElement
          )
        );
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // =========================================
  // THEATER MODE
  // =========================================

  const toggleTheater =
    () => {
      setIsTheaterMode(
        (previous) => !previous
      );

      showPlayerControls();
    };

  // =========================================
  // PIP
  // =========================================

  const togglePiP =
    async () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      try {
        if (
          document.pictureInPictureElement
        ) {
          await document.exitPictureInPicture();
          setIsPiP(false);
        } else if (
          document.pictureInPictureEnabled
        ) {
          await player.requestPictureInPicture();
          setIsPiP(true);
        }
      } catch (error) {
        console.error(
          "PIP ERROR:",
          error
        );
      }

      showPlayerControls();
    };

  // =========================================
  // PIP CHANGE
  // =========================================

  useEffect(() => {
    const player =
      videoRef.current;

    if (!player) {
      return;
    }

    const handleEnter =
      () => setIsPiP(true);

    const handleLeave =
      () => setIsPiP(false);

    player.addEventListener(
      "enterpictureinpicture",
      handleEnter
    );

    player.addEventListener(
      "leavepictureinpicture",
      handleLeave
    );

    return () => {
      player.removeEventListener(
        "enterpictureinpicture",
        handleEnter
      );

      player.removeEventListener(
        "leavepictureinpicture",
        handleLeave
      );
    };
  }, [videoUrl]);

  // =========================================
  // SUBTITLE CHECK
  // =========================================

  const checkSubtitleTrack =
    () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      setHasSubtitles(
        player.textTracks.length > 0
      );
    };

  // =========================================
  // SUBTITLE TOGGLE
  // =========================================

  const toggleSubtitles =
    () => {
      const player =
        videoRef.current;

      if (!player) {
        return;
      }

      const tracks =
        player.textTracks;

      if (!tracks.length) {
        return;
      }

      const newState =
        !subtitlesEnabled;

      for (
        let i = 0;
        i < tracks.length;
        i++
      ) {
        tracks[i].mode =
          newState
            ? "showing"
            : "hidden";
      }

      setSubtitlesEnabled(
        newState
      );

      showPlayerControls();
    };

  // =========================================
  // KEYBOARD SHORTCUTS
  // =========================================

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        const target =
          event.target as HTMLElement;

        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA"
        ) {
          return;
        }

        const player =
          videoRef.current;

        if (!player) {
          return;
        }

        switch (event.key) {
          case " ":
          case "k":
          case "K":
            event.preventDefault();
            togglePlay();
            break;

          case "ArrowLeft":
            event.preventDefault();

            seekBy(
              event.shiftKey
                ? -30
                : -10
            );
            break;

          case "ArrowRight":
            event.preventDefault();

            seekBy(
              event.shiftKey
                ? 30
                : 10
            );
            break;

          case "ArrowUp":
            event.preventDefault();

            player.volume =
              Math.min(
                1,
                player.volume +
                  0.1
              );

            setVolume(
              player.volume
            );

            setIsMuted(false);
            break;

          case "ArrowDown":
            event.preventDefault();

            player.volume =
              Math.max(
                0,
                player.volume -
                  0.1
              );

            setVolume(
              player.volume
            );

            setIsMuted(
              player.volume === 0
            );
            break;

          case "m":
          case "M":
            event.preventDefault();
            toggleMute();
            break;

          case "f":
          case "F":
            event.preventDefault();
            toggleFullscreen();
            break;

          case "t":
          case "T":
            event.preventDefault();
            toggleTheater();
            break;

          case "p":
          case "P":
            event.preventDefault();
            togglePiP();
            break;

          case "c":
          case "C":
            event.preventDefault();

            if (hasSubtitles) {
              toggleSubtitles();
            }

            break;

          case ">":
          case ".":
            if (event.shiftKey) {
              event.preventDefault();

              changePlaybackSpeed(
                Math.min(
                  2,
                  playbackRate +
                    0.25
                )
              );
            }

            break;

          case "<":
          case ",":
            if (event.shiftKey) {
              event.preventDefault();

              changePlaybackSpeed(
                Math.max(
                  0.5,
                  playbackRate -
                    0.25
                )
              );
            }

            break;

          default:
            break;
        }

        showPlayerControls();
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    hasSubtitles,
    playbackRate,
    showPlayerControls,
  ]);

  // =========================================
  // CONTROLS AUTO HIDE
  // =========================================

  useEffect(() => {
    if (
      controlsTimerRef.current
    ) {
      clearTimeout(
        controlsTimerRef.current
      );
    }

    if (isPlaying) {
      controlsTimerRef.current =
        setTimeout(() => {
          setShowControls(false);
        }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (
        controlsTimerRef.current
      ) {
        clearTimeout(
          controlsTimerRef.current
        );
      }
    };
  }, [isPlaying]);

  // =========================================
  // CLEANUP
  // =========================================

  useEffect(() => {
    return () => {
      if (
        progressSaveTimerRef.current
      ) {
        clearInterval(
          progressSaveTimerRef.current
        );
      }

      if (
        controlsTimerRef.current
      ) {
        clearTimeout(
          controlsTimerRef.current
        );
      }

      if (
        resumeMessageTimerRef.current
      ) {
        clearTimeout(
          resumeMessageTimerRef.current
        );
      }

      if (
        countdownTimerRef.current
      ) {
        clearInterval(
          countdownTimerRef.current
        );
      }
    };
  }, []);

  // =========================================
  // LOADING SCREEN
  // =========================================

  if (loading) {
    return (
      <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-gray-600 border-t-white rounded-full animate-spin mb-4" />

        <p>
          Checking video access...
        </p>
      </div>
    );
  }

  // =========================================
  // ACCESS ERROR
  // =========================================

  if (
    error ||
    !accessGranted
  ) {
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
          className="mt-5 px-5 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
        >
          View Subscription Plans
        </button>
      </div>
    );
  }

  const progressPercent =
    duration > 0
      ? (currentTime /
          duration) *
        100
      : 0;

  return (
    <div
      ref={playerRef}
      className={`custom-video-player ${
        isTheaterMode
          ? "theater-video-player"
          : ""
      } rounded-lg`}
      onMouseMove={
        showPlayerControls
      }
      onMouseLeave={
        hideTimelinePreview
      }
    >
      {/* ====================================
          VIDEO
      ==================================== */}

      <video
        ref={videoRef}
        className="w-full h-full aspect-video object-contain bg-black"
        src={videoUrl}
        playsInline
        preload="metadata"
        onLoadedMetadata={
          handleLoadedMetadata
        }
        onTimeUpdate={
          handleTimeUpdate
        }
        onProgress={
          updateBuffered
        }
        onPlay={
          handlePlay
        }
        onPause={
          handlePause
        }
        onEnded={
          handleEnded
        }
        onWaiting={
          handleWaiting
        }
        onCanPlay={
          handleCanPlay
        }
        onPlaying={
          handlePlaying
        }
        onLoadedData={
          handleCanPlay
        }
        onCanPlayThrough={
          handleCanPlay
        }
        onVolumeChange={() => {
          const player =
            videoRef.current;

          if (!player) {
            return;
          }

          setVolume(
            player.volume
          );

          setIsMuted(
            player.muted
          );
        }}
        onClick={
          togglePlay
        }
        onMouseMove={
          showPlayerControls
        }
      >
        {subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang="en"
            label="English"
            default={false}
            onLoad={
              checkSubtitleTrack
            }
          />
        )}

        Your browser does not support
        the video tag.
      </video>

      {/* ====================================
          BUFFERING
      ==================================== */}

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 rounded-full p-4">
            <div className="w-10 h-10 border-4 border-gray-500 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* ====================================
          CENTER PLAY
      ==================================== */}

      {!isPlaying &&
        !buffering &&
        !showNextVideoCountdown && (
          <button
            type="button"
            onClick={
              togglePlay
            }
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition z-20"
            aria-label="Play"
          >
            <span className="text-3xl ml-1">
              ▶
            </span>
          </button>
        )}

      {/* ====================================
          RESUME MESSAGE
      ==================================== */}

      {resumeMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-30">
          ↻ {resumeMessage}
        </div>
      )}

      {/* ====================================
          COMPLETED
      ==================================== */}

      {completed && (
        <div className="absolute top-4 right-4 bg-green-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium z-30">
          ✓ Completed
        </div>
      )}

      {/* ====================================
          DAY 5 - NEXT VIDEO COUNTDOWN
      ==================================== */}

      {showNextVideoCountdown &&
        hasNextVideo && (
          <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md text-center shadow-2xl">
              <div className="text-gray-400 text-sm mb-2">
                Up next
              </div>

              <h3 className="text-white text-xl font-semibold mb-3">
                {video.nextVideoTitle ||
                  "Next video"}
              </h3>

              <div className="text-5xl font-bold text-red-500 mb-4">
                {nextVideoCountdown}
              </div>

              <p className="text-gray-300 text-sm mb-5">
                Next video will start
                automatically.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={
                    goToNextVideo
                  }
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Play Now
                </button>

                <button
                  type="button"
                  onClick={
                    cancelNextVideo
                  }
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ====================================
          CONTROLS
      ==================================== */}

      <div
        className={`absolute left-0 right-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls &&
          !showNextVideoCountdown
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black via-black/80 to-transparent pt-12 px-3 pb-3">
          {/* ==================================
              TIMELINE
          ================================== */}

          <div
            ref={
              progressBarRef
            }
            className="relative h-5 flex items-center cursor-pointer group"
            onClick={
              seekFromTimeline
            }
            onMouseMove={
              handleTimelineHover
            }
            onMouseLeave={
              hideTimelinePreview
            }
          >
            {/* BUFFER */}
            <div className="absolute left-0 right-0 h-1.5 bg-gray-500/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-300/60"
                style={{
                  width: `${bufferedPercent}%`,
                }}
              />
            </div>

            {/* PLAYED */}
            <div
              className="absolute left-0 h-1.5 bg-red-600 rounded-full"
              style={{
                width: `${progressPercent}%`,
              }}
            />

            {/* HOVER DOT */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition"
              style={{
                left: `${progressPercent}%`,
                transform:
                  "translate(-50%, -50%)",
              }}
            />

            {/* =================================
                HOVER PREVIEW
            ================================= */}

            {hoverPreview.visible && (
              <div
                className="absolute bottom-6 -translate-x-1/2 z-50 pointer-events-none"
                style={{
                  left: `${hoverPreview.x}px`,
                }}
              >
                <div className="bg-black rounded-lg overflow-hidden border border-white/20 shadow-2xl">
                  <div className="relative w-48 h-28 bg-gray-900">
                    <video
                      ref={
                        previewVideoRef
                      }
                      src={videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className={`w-full h-full object-cover ${
                        previewReady
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                      onLoadedData={
                        handlePreviewLoaded
                      }
                    />

                    {!previewReady && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 right-1 text-center">
                      <span className="bg-black/80 text-white px-2 py-0.5 rounded text-xs">
                        {formatTime(
                          hoverPreview.time
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================================
              CONTROL ROW
          ================================== */}

          <div className="flex items-center gap-2 text-white">
            {/* PLAY */}
            <button
              type="button"
              onClick={
                togglePlay
              }
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition"
              title={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
            >
              {isPlaying
                ? "❚❚"
                : "▶"}
            </button>

            {/* BACK */}
            <button
              type="button"
              onClick={() =>
                seekBy(-10)
              }
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition text-xs"
              title="Back 10 seconds"
            >
              ↶10
            </button>

            {/* FORWARD */}
            <button
              type="button"
              onClick={() =>
                seekBy(10)
              }
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition text-xs"
              title="Forward 10 seconds"
            >
              10↷
            </button>

            {/* VOLUME */}
            <button
              type="button"
              onClick={
                toggleMute
              }
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded"
              title={
                isMuted
                  ? "Unmute"
                  : "Mute"
              }
            >
              {isMuted
                ? "🔇"
                : volume < 0.5
                ? "🔉"
                : "🔊"}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={
                isMuted
                  ? 0
                  : volume
              }
              onChange={
                handleVolumeChange
              }
              className="volume-slider w-20 cursor-pointer"
              aria-label="Volume"
            />

            {/* TIME */}
            <div className="text-xs whitespace-nowrap ml-1">
              {formatTime(
                currentTime
              )}{" "}
              /{" "}
              {formatTime(
                duration
              )}
            </div>

            {/* REMAINING */}
            <div className="hidden sm:block text-xs text-gray-400 whitespace-nowrap">
              -
              {formatTime(
                Math.max(
                  0,
                  duration -
                    currentTime
                )
              )}
            </div>

            <div className="flex-1" />

            {/* WATCHED */}
            <div className="hidden md:block text-xs text-gray-300">
              Watched{" "}
              {Math.round(
                watchedPercent
              )}
              %
            </div>

            {/* QUALITY */}
            <div
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-xs text-gray-200"
              title="Video quality"
            >
              <span>HD</span>
              <span>
                {videoQuality}
              </span>
            </div>

            {/* SAVING */}
            {isSavingProgress && (
              <div className="hidden md:block text-xs text-gray-400">
                Saving...
              </div>
            )}

            {/* SUBTITLES */}
            {hasSubtitles && (
              <button
                type="button"
                onClick={
                  toggleSubtitles
                }
                className={`w-9 h-9 flex items-center justify-center rounded transition ${
                  subtitlesEnabled
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }`}
                title="Subtitles (C)"
              >
                CC
              </button>
            )}

            {/* SPEED */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowSpeedMenu(
                    (previous) =>
                      !previous
                  )
                }
                className="px-2 h-9 text-xs hover:bg-white/10 rounded transition"
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-11 right-0 bg-black/95 border border-white/10 rounded-lg p-1 w-24 shadow-xl">
                  {[0.5, 1, 1.25, 1.5, 2].map(
                    (speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() =>
                          changePlaybackSpeed(
                            speed
                          )
                        }
                        className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-white/10 ${
                          playbackRate ===
                          speed
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {speed}x
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* PIP */}
            {"pictureInPictureEnabled" in
              document &&
              document.pictureInPictureEnabled && (
                <button
                  type="button"
                  onClick={
                    togglePiP
                  }
                  className={`w-9 h-9 flex items-center justify-center rounded transition ${
                    isPiP
                      ? "bg-white/20"
                      : "hover:bg-white/10"
                  }`}
                  title="Picture in Picture (P)"
                >
                  ⧉
                </button>
              )}

            {/* THEATER */}
            <button
              type="button"
              onClick={
                toggleTheater
              }
              className={`w-9 h-9 flex items-center justify-center rounded transition ${
                isTheaterMode
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
              title="Theater mode (T)"
            >
              ▣
            </button>

            {/* FULLSCREEN */}
            <button
              type="button"
              onClick={
                toggleFullscreen
              }
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition"
              title="Fullscreen (F)"
            >
              ⛶
            </button>
          </div>

          {/* ==================================
              VIDEO TITLE
          ================================== */}

          <div className="mt-2 text-xs text-gray-300 truncate">
            {video.videotitle}
          </div>
        </div>
      </div>
    </div>
  );
}