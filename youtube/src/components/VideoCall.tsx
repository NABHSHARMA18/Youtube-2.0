import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getVideoCallSocket,
  disconnectVideoCallSocket,
} from "../lib/videoCallSocket";

type Participant = {
  socketId: string;
  email: string;
  name: string;

  role:
    | "host"
    | "cohost"
    | "participant";

  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  joinedAt: number;
};

type ChatMessage = {
  id: string;
  from: string;
  name: string;
  text: string;
  type: "text";
  time: number;
};

type Props = {
  roomId: string;
  userEmail: string;
  userName?: string;
  hostEmail?: string;
  maxParticipants?: number;
};

const ICE_SERVERS = {
  iceServers: [
    {
      urls:
        "stun:stun.l.google.com:19302",
    },

    {
      urls:
        "stun:stun1.l.google.com:19302",
    },
  ],
};

const formatTime = (
  seconds: number
) => {
  const s = Math.max(
    0,
    Math.floor(seconds)
  );

  const h = Math.floor(
    s / 3600
  );

  const m = Math.floor(
    (s % 3600) / 60
  );

  const sec = s % 60;

  if (h) {
    return `${h}:${String(
      m
    ).padStart(2, "0")}:${String(
      sec
    ).padStart(2, "0")}`;
  }

  return `${m}:${String(
    sec
  ).padStart(2, "0")}`;
};

const readStoredUser = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const raw =
      localStorage.getItem(
        "user"
      );

    if (!raw) return {};

    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const VideoTile = ({
  participant,
  stream,
  local,
  videoRef,
}: {
  participant: Participant;
  stream?: MediaStream;
  local?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
}) => {
  const internalRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    const element =
      videoRef?.current ||
      internalRef.current;

    if (
      element &&
      stream
    ) {
      element.srcObject =
        stream;
    }
  }, [
    stream,
    videoRef,
  ]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 min-h-[190px] border border-white/10">
      <video
        ref={
          videoRef ||
          internalRef
        }
        autoPlay
        playsInline
        muted={local}
        className={`h-full w-full object-cover ${
          participant.cameraOn
            ? "block"
            : "hidden"
        }`}
      />

      {!participant.cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold">
            {participant.name
              .slice(0, 1)
              .toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm">
        <span>
          {participant.name}
        </span>

        {participant.role !==
          "participant" && (
          <span className="text-xs text-cyan-300">
            {participant.role}
          </span>
        )}

        {!participant.micOn && (
          <span title="Muted">
            🔇
          </span>
        )}

        {participant.handRaised && (
          <span title="Raised hand">
            ✋
          </span>
        )}
      </div>

      {participant.screenSharing && (
        <div className="absolute top-3 left-3 rounded-md bg-emerald-600/90 px-2 py-1 text-xs">
          Screen sharing
        </div>
      )}
    </div>
  );
};

export default function VideoCall({
  roomId,
  userEmail,
  userName,
  hostEmail,
  maxParticipants = 6,
}: Props) {
  const socket = useMemo(
    () =>
      getVideoCallSocket(),
    []
  );

  const localVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const localStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const peerConnectionsRef =
    useRef<
      Record<
        string,
        RTCPeerConnection
      >
    >({});

  const remoteStreamsRef =
    useRef<
      Record<
        string,
        MediaStream
      >
    >({});

  const reconnectTimersRef =
    useRef<
      Record<
        string,
        ReturnType<
          typeof setTimeout
        >
      >
    >({});

  const [joined, setJoined] =
    useState(false);

  const [participants, setParticipants] =
    useState<
      Record<
        string,
        Participant
      >
    >({});

  const [remoteStreams, setRemoteStreams] =
    useState<
      Record<
        string,
        MediaStream
      >
    >({});

  const [micOn, setMicOn] =
    useState(true);

  const [cameraOn, setCameraOn] =
    useState(true);

  const [handRaised, setHandRaised] =
    useState(false);

  const [screenSharing, setScreenSharing] =
    useState(false);

  const [
    showParticipants,
    setShowParticipants,
  ] = useState(false);

  const [showChat, setShowChat] =
    useState(false);

  const [chat, setChat] =
    useState<ChatMessage[]>(
      []
    );

  const [chatText, setChatText] =
    useState("");

  const [error, setError] =
    useState("");

  const [status, setStatus] =
    useState("Connecting...");

  const [callSeconds, setCallSeconds] =
    useState(0);

  const [
    connectionQuality,
    setConnectionQuality,
  ] = useState("Good");

  const [locked, setLocked] =
    useState(false);

  const [
    chatEnabled,
    setChatEnabled,
  ] = useState(true);

  const [
    screenShareEnabled,
    setScreenShareEnabled,
  ] = useState(true);

  const [isHost, setIsHost] =
    useState(false);

  const myName =
    userName ||
    readStoredUser()?.name ||
    readStoredUser()?.displayName ||
    userEmail.split("@")[0];

  const updateParticipant = (
    socketId: string,
    patch: Partial<Participant>
  ) => {
    setParticipants(
      (prev) => {
        if (!prev[socketId]) {
          return prev;
        }

        return {
          ...prev,

          [socketId]: {
            ...prev[socketId],
            ...patch,
          },
        };
      }
    );
  };

  /*
   * CREATE PEER
   */

  const createPeerConnection =
    async (
      peer: Participant,
      makeOffer: boolean
    ) => {
      if (
        peerConnectionsRef.current[
          peer.socketId
        ]
      ) {
        return peerConnectionsRef
          .current[
          peer.socketId
        ];
      }

      const pc =
        new RTCPeerConnection(
          ICE_SERVERS
        );

      peerConnectionsRef.current[
        peer.socketId
      ] = pc;

      const localStream =
        localStreamRef.current;

      localStream
        ?.getTracks()
        .forEach(
          (track) => {
            pc.addTrack(
              track,
              localStream
            );
          }
        );

      pc.onicecandidate = (
        event
      ) => {
        if (
          event.candidate
        ) {
          socket.emit(
            "ice-candidate",
            {
              target:
                peer.socketId,

              candidate:
                event.candidate,
            }
          );
        }
      };

      pc.ontrack = (
        event
      ) => {
        const stream =
          event.streams[0];

        if (!stream) return;

        remoteStreamsRef.current[
          peer.socketId
        ] = stream;

        setRemoteStreams(
          (prev) => ({
            ...prev,

            [peer.socketId]:
              stream,
          })
        );
      };

      pc.onconnectionstatechange =
        () => {
          const state =
            pc.connectionState;

          if (
            state ===
            "connected"
          ) {
            setStatus(
              "Connected"
            );

            setConnectionQuality(
              "Good"
            );
          }

          if (
            state ===
            "connecting"
          ) {
            setStatus(
              "Connecting..."
            );
          }

          if (
            state ===
              "disconnected" ||
            state ===
              "failed"
          ) {
            setConnectionQuality(
              "Unstable"
            );

            scheduleReconnect(
              peer
            );
          }
        };

      if (makeOffer) {
        const offer =
          await pc.createOffer();

        await pc.setLocalDescription(
          offer
        );

        socket.emit(
          "offer",
          {
            target:
              peer.socketId,

            offer:
              pc.localDescription,
          }
        );
      }

      return pc;
    };

  /*
   * RECONNECT
   */

  const scheduleReconnect = (
    peer: Participant
  ) => {
    if (
      reconnectTimersRef.current[
        peer.socketId
      ]
    ) {
      return;
    }

    reconnectTimersRef.current[
      peer.socketId
    ] = setTimeout(
      async () => {
        delete reconnectTimersRef
          .current[
          peer.socketId
        ];

        closePeer(
          peer.socketId
        );

        try {
          await createPeerConnection(
            peer,
            true
          );
        } catch (error) {
          console.error(
            "RECONNECT ERROR",
            error
          );
        }
      },
      1500
    );
  };

  /*
   * CLOSE PEER
   */

  const closePeer = (
    socketId: string
  ) => {
    peerConnectionsRef.current[
      socketId
    ]?.close();

    delete peerConnectionsRef
      .current[socketId];

    delete remoteStreamsRef
      .current[socketId];

    setRemoteStreams(
      (prev) => {
        const next = {
          ...prev,
        };

        delete next[
          socketId
        ];

        return next;
      }
    );
  };

  /*
   * START MEDIA
   */

  const startMedia =
    async () => {
      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          "Your browser does not support camera/microphone access."
        );
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                facingMode:
                  "user",
              },

              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,

                autoGainControl:
                  true,
              },
            }
          );

        localStreamRef.current =
          stream;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            stream;
        }
      } catch (err: any) {
        if (
          err?.name ===
          "NotAllowedError"
        ) {
          throw new Error(
            "Camera/microphone permission was denied. Allow permission and try again."
          );
        }

        if (
          err?.name ===
          "NotFoundError"
        ) {
          throw new Error(
            "No camera or microphone was found."
          );
        }

        throw new Error(
          "Unable to start camera/microphone."
        );
      }
    };

  /*
   * JOIN ROOM
   */

  const joinRoom =
    async () => {
      setError("");

      try {
        await startMedia();

        socket.connect();

        const onConnect =
          () => {
            socket.emit(
              "join-room",
              {
                roomId,

                email:
                  userEmail,

                name:
                  myName,

                role:
                  userEmail ===
                  hostEmail
                    ? "host"
                    : "participant",

                maxParticipants,

                micOn: true,

                cameraOn: true,
              },

              async (
                result: any
              ) => {
                if (
                  !result?.ok
                ) {
                  setError(
                    result?.message ||
                      "Unable to join meeting."
                  );

                  localStreamRef.current
                    ?.getTracks()
                    .forEach(
                      (track) =>
                        track.stop()
                    );

                  socket.disconnect();

                  return;
                }

                setJoined(
                  true
                );

                setStatus(
                  "Connected"
                );

                setLocked(
                  Boolean(
                    result.locked
                  )
                );

                setChatEnabled(
                  result.chatEnabled !==
                    false
                );

                setScreenShareEnabled(
                  result.screenShareEnabled !==
                    false
                );

                setIsHost(
                  result.self
                    ?.role ===
                    "host"
                );

                const list: Record<
                  string,
                  Participant
                > = {};

                (
                  result.participants ||
                  []
                ).forEach(
                  (
                    p: Participant
                  ) => {
                    list[
                      p.socketId
                    ] = p;
                  }
                );

                setParticipants(
                  list
                );

                /*
                 * New participant
                 * creates offers to
                 * existing participants.
                 */

                for (const peer of
                  result.peers ||
                  []) {
                  await createPeerConnection(
                    peer,
                    true
                  );
                }
              }
            );
          };

        socket.once(
          "connect",
          onConnect
        );

        if (socket.connected) {
          onConnect();
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to join meeting."
        );
      }
    };

  /*
   * SOCKET EVENTS
   */

  useEffect(() => {
    const onParticipantJoined =
      (
        participant: Participant
      ) => {
        setParticipants(
          (prev) => ({
            ...prev,

            [participant.socketId]:
              participant,
          })
        );

        setStatus(
          `${participant.name} joined`
        );
      };

    const onOffer =
      async ({
        from,
        offer,
      }: any) => {
        let peer =
          participants[
            from
          ];

        /*
         * If React state is
         * not updated yet, create
         * temporary participant.
         */

        if (!peer) {
          peer = {
            socketId: from,

            email: "",

            name:
              "Participant",

            role:
              "participant",

            micOn: true,

            cameraOn: true,

            handRaised:
              false,

            screenSharing:
              false,

            joinedAt:
              Date.now(),
          };

          setParticipants(
            (prev) => ({
              ...prev,

              [from]: peer!,
            })
          );
        }

        const pc =
          await createPeerConnection(
            peer,
            false
          );

        await pc.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        const answer =
          await pc.createAnswer();

        await pc.setLocalDescription(
          answer
        );

        socket.emit(
          "answer",
          {
            target: from,

            answer:
              pc.localDescription,
          }
        );
      };

    const onAnswer =
      async ({
        from,
        answer,
      }: any) => {
        const pc =
          peerConnectionsRef.current[
            from
          ];

        if (!pc) return;

        await pc.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );
      };

    const onIce =
      async ({
        from,
        candidate,
      }: any) => {
        const pc =
          peerConnectionsRef.current[
            from
          ];

        if (
          !pc ||
          !candidate
        ) {
          return;
        }

        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
        } catch (error) {
          console.error(
            "ICE ERROR",
            error
          );
        }
      };

    const onParticipantLeft =
      ({
        socketId,
      }: any) => {
        closePeer(
          socketId
        );

        setParticipants(
          (prev) => {
            const next = {
              ...prev,
            };

            delete next[
              socketId
            ];

            return next;
          }
        );
      };

    const onMediaState =
      (state: any) => {
        updateParticipant(
          state.socketId,
          state
        );
      };

    const onChat =
      (
        message: ChatMessage
      ) => {
        setChat(
          (prev) => [
            ...prev,
            message,
          ]
        );
      };

    const onMeetingSettings =
      (settings: any) => {
        if (
          typeof settings.locked ===
          "boolean"
        ) {
          setLocked(
            settings.locked
          );
        }

        if (
          typeof settings.chatEnabled ===
          "boolean"
        ) {
          setChatEnabled(
            settings.chatEnabled
          );
        }

        if (
          typeof settings.screenShareEnabled ===
          "boolean"
        ) {
          setScreenShareEnabled(
            settings.screenShareEnabled
          );
        }
      };

    const onForceMute =
      () => {
        localStreamRef.current
          ?.getAudioTracks()
          .forEach(
            (track) => {
              track.enabled =
                false;
            }
          );

        setMicOn(false);
      };

    const onRole =
      ({
        socketId,
        role,
      }: any) => {
        updateParticipant(
          socketId,
          { role }
        );

        if (
          socketId ===
          socket.id
        ) {
          setIsHost(
            role ===
              "host"
          );
        }
      };

    const onRemoved =
      ({
        message,
      }: any) => {
        setError(
          message ||
            "You were removed from the meeting."
        );

        leaveRoom();
      };

    socket.on(
      "participant-joined",
      onParticipantJoined
    );

    socket.on(
      "offer",
      onOffer
    );

    socket.on(
      "answer",
      onAnswer
    );

    socket.on(
      "ice-candidate",
      onIce
    );

    socket.on(
      "participant-left",
      onParticipantLeft
    );

    socket.on(
      "media-state",
      onMediaState
    );

    socket.on(
      "chat-message",
      onChat
    );

    socket.on(
      "meeting-settings",
      onMeetingSettings
    );

    socket.on(
      "force-mute",
      onForceMute
    );

    socket.on(
      "participant-role",
      onRole
    );

    socket.on(
      "removed-from-meeting",
      onRemoved
    );

    return () => {
      socket.off(
        "participant-joined",
        onParticipantJoined
      );

      socket.off(
        "offer",
        onOffer
      );

      socket.off(
        "answer",
        onAnswer
      );

      socket.off(
        "ice-candidate",
        onIce
      );

      socket.off(
        "participant-left",
        onParticipantLeft
      );

      socket.off(
        "media-state",
        onMediaState
      );

      socket.off(
        "chat-message",
        onChat
      );

      socket.off(
        "meeting-settings",
        onMeetingSettings
      );

      socket.off(
        "force-mute",
        onForceMute
      );

      socket.off(
        "participant-role",
        onRole
      );

      socket.off(
        "removed-from-meeting",
        onRemoved
      );
    };
  }, [
    socket,
    joined,
    participants,
  ]);

  /*
   * CALL TIMER
   */

  useEffect(() => {
    const timer =
      setInterval(() => {
        if (joined) {
          setCallSeconds(
            (value) =>
              value + 1
          );
        }
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [joined]);

  /*
   * CONNECTION QUALITY
   */

  useEffect(() => {
    const qualityTimer =
      setInterval(
        async () => {
          const peerIds =
            Object.keys(
              peerConnectionsRef.current
            );

          if (
            !peerIds.length
          ) {
            return;
          }

          try {
            const pc =
              peerConnectionsRef.current[
                peerIds[0]
              ];

            const stats =
              await pc.getStats();

            let packetsLost = 0;

            let packetsReceived =
              0;

            stats.forEach(
              (report) => {
                if (
                  report.type ===
                    "inbound-rtp" &&
                  report.kind ===
                    "video"
                ) {
                  packetsLost +=
                    report.packetsLost ||
                    0;

                  packetsReceived +=
                    report.packetsReceived ||
                    0;
                }
              }
            );

            const total =
              packetsLost +
              packetsReceived;

            const loss =
              total > 0
                ? packetsLost /
                  total
                : 0;

            if (
              loss >
              0.1
            ) {
              setConnectionQuality(
                "Poor"
              );
            } else if (
              loss >
              0.03
            ) {
              setConnectionQuality(
                "Unstable"
              );
            } else {
              setConnectionQuality(
                "Good"
              );
            }
          } catch {
            setConnectionQuality(
              "Unknown"
            );
          }
        },
        5000
      );

    return () =>
      clearInterval(
        qualityTimer
      );
  }, []);

  /*
   * MIC
   */

  const toggleMic =
    () => {
      const next =
        !micOn;

      localStreamRef.current
        ?.getAudioTracks()
        .forEach(
          (track) => {
            track.enabled =
              next;
          }
        );

      setMicOn(next);

      socket.emit(
        "media-state",
        {
          micOn: next,
        }
      );
    };

  /*
   * CAMERA
   */

  const toggleCamera =
    () => {
      const next =
        !cameraOn;

      localStreamRef.current
        ?.getVideoTracks()
        .forEach(
          (track) => {
            track.enabled =
              next;
          }
        );

      setCameraOn(next);

      socket.emit(
        "media-state",
        {
          cameraOn:
            next,
        }
      );
    };

  /*
   * CAMERA SWITCH
   */

  const switchCamera =
    async () => {
      const currentVideo =
        localStreamRef.current
          ?.getVideoTracks()[0];

      if (!currentVideo)
        return;

      const currentSettings =
        currentVideo.getSettings();

      const nextFacing =
        currentSettings.facingMode ===
        "environment"
          ? "user"
          : "environment";

      try {
        const replacement =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  nextFacing,
              },

              audio: false,
            }
          );

        const newTrack =
          replacement.getVideoTracks()[0];

        Object.values(
          peerConnectionsRef.current
        ).forEach(
          (pc) => {
            const sender =
              pc.getSenders().find(
                (s) =>
                  s.track
                    ?.kind ===
                  "video"
              );

            if (sender) {
              sender.replaceTrack(
                newTrack
              );
            }
          }
        );

        currentVideo.stop();

        const audioTracks =
          localStreamRef.current?.getAudioTracks() ||
          [];

        localStreamRef.current =
          new MediaStream([
            newTrack,
            ...audioTracks,
          ]);

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            localStreamRef.current;
        }
      } catch {
        setError(
          "Unable to switch camera."
        );
      }
    };

  /*
   * SCREEN SHARE
   */

  const shareScreen =
    async () => {
      if (
        !screenShareEnabled
      ) {
        return;
      }

      try {
        const displayStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,

              audio: false,
            }
          );

        const screenTrack =
          displayStream.getVideoTracks()[0];

        Object.values(
          peerConnectionsRef.current
        ).forEach(
          (pc) => {
            const sender =
              pc.getSenders().find(
                (s) =>
                  s.track
                    ?.kind ===
                  "video"
              );

            if (sender) {
              sender.replaceTrack(
                screenTrack
              );
            }
          }
        );

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            displayStream;
        }

        setScreenSharing(
          true
        );

        socket.emit(
          "media-state",
          {
            screenSharing:
              true,
          }
        );

        screenTrack.onended =
          () => {
            const cameraTrack =
              localStreamRef.current
                ?.getVideoTracks()[0];

            if (
              !cameraTrack
            ) {
              return;
            }

            Object.values(
              peerConnectionsRef.current
            ).forEach(
              (pc) => {
                const sender =
                  pc.getSenders().find(
                    (s) =>
                      s.track
                        ?.kind ===
                      "video"
                  );

                if (sender) {
                  sender.replaceTrack(
                    cameraTrack
                  );
                }
              }
            );

            if (
              localVideoRef.current
            ) {
              localVideoRef.current.srcObject =
                localStreamRef.current;
            }

            setScreenSharing(
              false
            );

            socket.emit(
              "media-state",
              {
                screenSharing:
                  false,
              }
            );
          };
      } catch (error) {
        console.error(
          "SCREEN SHARE ERROR",
          error
        );
      }
    };

  /*
   * CHAT
   */

  const sendChat =
    () => {
      const text =
        chatText.trim();

      if (
        !text ||
        !chatEnabled
      ) {
        return;
      }

      socket.emit(
        "chat-message",
        {
          text,
        }
      );

      setChatText("");
    };

  /*
   * FILE
   */

  const sendFile =
    async (
      file: File
    ) => {
      if (
        !chatEnabled
      ) {
        return;
      }

      if (
        file.size >
        2 *
          1024 *
          1024
      ) {
        setError(
          "Chat files must be 2 MB or smaller."
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () => {
          socket.emit(
            "chat-file",
            {
              name:
                file.name,

              type:
                file.type,

              size:
                file.size,

              data:
                reader.result,
            }
          );
        };

      reader.readAsDataURL(
        file
      );
    };

  /*
   * RAISE HAND
   */

  const raiseHand =
    () => {
      const next =
        !handRaised;

      setHandRaised(
        next
      );

      socket.emit(
        "media-state",
        {
          handRaised:
            next,
        }
      );
    };

  /*
   * HOST ACTION
   */

  const hostAction =
    (
      action: string,
      targetSocketId?: string
    ) => {
      socket.emit(
        "host-action",
        {
          action,

          targetSocketId,
        }
      );
    };

  /*
   * LEAVE
   */

  const leaveRoom =
    () => {
      socket.emit(
        "leave-room"
      );

      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (pc) =>
          pc.close()
      );

      peerConnectionsRef.current =
        {};

      localStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      socket.disconnect();

      disconnectVideoCallSocket();

      setJoined(false);
    };

  /*
   * FULLSCREEN
   */

  const requestFullscreen =
    async () => {
      const element =
        document.getElementById(
          "video-call-root"
        );

      if (!element)
        return;

      if (
        !document.fullscreenElement
      ) {
        await element.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    };

  /*
   * JOIN SCREEN
   */

  if (!joined) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold mb-2">
            Join Video Meeting
          </h1>

          <p className="text-slate-400 mb-6">
            Room:
            {" "}
            <span className="text-white font-mono">
              {roomId}
            </span>
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={
              joinRoom
            }
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold"
          >
            Allow Camera & Microphone and Join
          </button>

          <p className="mt-4 text-xs text-slate-500">
            Your browser will ask for camera and microphone permission.
          </p>
        </div>
      </div>
    );
  }

  const otherParticipants =
    Object.values(
      participants
    ).filter(
      (p) =>
        p.socketId !==
        socket.id
    );

  const me: Participant = {
    socketId:
      socket.id ||
      "local",

    email:
      userEmail,

    name:
      myName,

    role:
      isHost
        ? "host"
        : "participant",

    micOn,

    cameraOn,

    handRaised,

    screenSharing,

    joinedAt:
      Date.now(),
  };

  return (
    <div
      id="video-call-root"
      className="min-h-screen bg-slate-950 text-white p-3 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">
            Video Meeting
          </h1>

          <div className="text-xs text-slate-400">
            Room {roomId}
            {" • "}
            {formatTime(
              callSeconds
            )}
            {" • "}
            {connectionQuality}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setShowParticipants(
                (value) =>
                  !value
              )
            }
            className="call-btn"
          >
            👥{" "}
            {
              Object.keys(
                participants
              ).length
            }
          </button>

          <button
            onClick={() =>
              setShowChat(
                (value) =>
                  !value
              )
            }
            className="call-btn"
          >
            💬 Chat
          </button>

          <button
            onClick={
              requestFullscreen
            }
            className="call-btn"
          >
            ⛶
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-4">
        <div>
          <div
            className={`grid gap-3 ${
              otherParticipants.length +
                1 <=
              2
                ? "grid-cols-1 md:grid-cols-2"
                : otherParticipants.length +
                    1 <=
                  4
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 min-h-[190px] border border-white/10">
              <video
                ref={
                  localVideoRef
                }
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover ${
                  cameraOn
                    ? "block"
                    : "hidden"
                }`}
              />

              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold">
                    {me.name
                      .slice(
                        0,
                        1
                      )
                      .toUpperCase()}
                  </div>
                </div>
              )}

              <div className="absolute left-3 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-sm">
                {me.name}
                {" (You)"}
                {" "}
                {!micOn &&
                  "🔇"}
                {" "}
                {handRaised &&
                  "✋"}
              </div>
            </div>

            {otherParticipants.map(
              (
                participant
              ) => (
                <VideoTile
                  key={
                    participant.socketId
                  }
                  participant={
                    participant
                  }
                  stream={
                    remoteStreams[
                      participant
                        .socketId
                    ]
                  }
                />
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={
                toggleMic
              }
              className="call-btn"
            >
              {micOn
                ? "🎙️ Mute"
                : "🔇 Unmute"}
            </button>

            <button
              onClick={
                toggleCamera
              }
              className="call-btn"
            >
              {cameraOn
                ? "📷 Camera Off"
                : "📹 Camera On"}
            </button>

            <button
              onClick={
                switchCamera
              }
              className="call-btn md:hidden"
            >
              🔄 Camera
            </button>

            <button
              onClick={
                shareScreen
              }
              className="call-btn"
            >
              🖥️ Share Screen
            </button>

            <button
              onClick={
                raiseHand
              }
              className="call-btn"
            >
              {handRaised
                ? "✋ Lower Hand"
                : "✋ Raise Hand"}
            </button>

            <button
              onClick={
                leaveRoom
              }
              className="call-btn-danger"
            >
              📞 Leave
            </button>
          </div>
        </div>

        {(showParticipants ||
          showChat) && (
          <aside className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden">
            {showParticipants && (
              <div className="p-4 border-b border-white/10">
                <div className="flex justify-between mb-3">
                  <h2 className="font-semibold">
                    Participants
                  </h2>

                  <span className="text-xs text-slate-400">
                    {
                      Object.keys(
                        participants
                      ).length
                    }
                    /
                    {
                      maxParticipants
                    }
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.values(
                    participants
                  ).map(
                    (
                      p
                    ) => (
                      <div
                        key={
                          p.socketId
                        }
                        className="rounded-lg bg-white/5 p-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {p.name}
                            {p.socketId ===
                              socket.id &&
                              " (You)"}
                          </div>

                          <div className="text-xs text-slate-400">
                            {p.role}
                            {" "}
                            {p.micOn
                              ? "🎙️"
                              : "🔇"}
                            {" "}
                            {p.cameraOn
                              ? "📷"
                              : "🚫"}
                            {" "}
                            {p.handRaised &&
                              "✋"}
                          </div>
                        </div>

                        {isHost &&
                          p.socketId !==
                            socket.id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  hostAction(
                                    "mute",
                                    p.socketId
                                  )
                                }
                                className="text-xs px-2 py-1 rounded bg-white/10"
                              >
                                Mute
                              </button>

                              <button
                                onClick={() =>
                                  hostAction(
                                    "cohost",
                                    p.socketId
                                  )
                                }
                                className="text-xs px-2 py-1 rounded bg-white/10"
                              >
                                Co-host
                              </button>

                              <button
                                onClick={() =>
                                  hostAction(
                                    "remove",
                                    p.socketId
                                  )
                                }
                                className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>

                {isHost && (
                  <div className="mt-4">
                    <button
                      onClick={() =>
                        hostAction(
                          locked
                            ? "unlock"
                            : "lock"
                        )
                      }
                      className="call-btn w-full"
                    >
                      {locked
                        ? "🔓 Unlock Meeting"
                        : "🔒 Lock Meeting"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {showChat && (
              <div className="p-4">
                <div className="flex justify-between mb-3">
                  <h2 className="font-semibold">
                    In-call Chat
                  </h2>

                  {!chatEnabled && (
                    <span className="text-xs text-red-300">
                      Disabled
                    </span>
                  )}
                </div>

                <div className="h-64 overflow-y-auto space-y-2 rounded-lg bg-black/20 p-2">
                  {chat.map(
                    (
                      message
                    ) => (
                      <div
                        key={
                          message.id
                        }
                        className="rounded-lg bg-white/5 p-2"
                      >
                        <div className="text-xs text-cyan-300">
                          {
                            message.name
                          }
                        </div>

                        <div className="text-sm break-words">
                          {
                            message.text
                          }
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={
                      chatText
                    }
                    onChange={(
                      e
                    ) =>
                      setChatText(
                        e.target
                          .value
                      )
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        sendChat();
                      }
                    }}
                    disabled={
                      !chatEnabled
                    }
                    placeholder="Message..."
                    className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 outline-none"
                  />

                  <button
                    onClick={
                      sendChat
                    }
                    className="call-btn"
                  >
                    Send
                  </button>
                </div>

                <label className="mt-2 inline-block text-xs text-slate-400 cursor-pointer">
                  📎 Send small file

                  <input
                    type="file"
                    className="hidden"
                    onChange={(
                      e
                    ) => {
                      const file =
                        e.target.files?.[0];

                      if (file) {
                        sendFile(
                          file
                        );
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-slate-500">
        Status:{" "}
        {status}
        {" • "}
        Quality:{" "}
        {connectionQuality}
      </div>
    </div>
  );
}