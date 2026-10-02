const rooms = new Map();

const cleanEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),

      locked: false,

      hostSocketId: null,

      chatEnabled: true,

      screenShareEnabled: true,
    });
  }

  return rooms.get(roomId);
};

const publicUser = (user) => ({
  socketId: user.socketId,

  email: user.email,

  name: user.name,

  role: user.role,

  micOn: user.micOn,

  cameraOn: user.cameraOn,

  handRaised: user.handRaised,

  screenSharing:
    user.screenSharing,

  joinedAt: user.joinedAt,
});

export const registerVideoCallSocket = (
  io
) => {
  io.on("connection", (socket) => {
    /*
     * JOIN ROOM
     */

    socket.on(
      "join-room",
      (
        payload = {},
        callback = () => {}
      ) => {
        const roomId = String(
          payload.roomId || ""
        )
          .trim()
          .toUpperCase();

        const email = cleanEmail(
          payload.email
        );

        const name = String(
          payload.name || "Guest"
        ).trim();

        if (!roomId || !email) {
          callback({
            ok: false,
            message:
              "Room ID and email are required.",
          });

          return;
        }

        const room = getRoom(roomId);

        if (room.locked) {
          callback({
            ok: false,
            message:
              "Meeting is locked.",
          });

          return;
        }

        const maxParticipants =
          Number(
            payload.maxParticipants
          ) || 6;

        if (
          room.users.size >=
          maxParticipants
        ) {
          callback({
            ok: false,
            message:
              "Maximum participant limit reached.",
          });

          return;
        }

        const role =
          payload.role === "host"
            ? "host"
            : payload.role === "cohost"
            ? "cohost"
            : "participant";

        const user = {
          socketId: socket.id,

          email,

          name,

          role,

          micOn:
            payload.micOn !== false,

          cameraOn:
            payload.cameraOn !== false,

          handRaised: false,

          screenSharing: false,

          joinedAt: Date.now(),
        };

        room.users.set(
          socket.id,
          user
        );

        if (role === "host") {
          room.hostSocketId =
            socket.id;
        }

        socket.join(roomId);

        socket.data.roomId =
          roomId;

        socket.data.email =
          email;

        const others = [
          ...room.users.values(),
        ]
          .filter(
            (u) =>
              u.socketId !==
              socket.id
          )
          .map(publicUser);

        callback({
          ok: true,

          self: publicUser(user),

          participants: [
            ...room.users.values(),
          ].map(publicUser),

          peers: others,

          locked: room.locked,

          chatEnabled:
            room.chatEnabled,

          screenShareEnabled:
            room.screenShareEnabled,
        });

        socket
          .to(roomId)
          .emit(
            "participant-joined",
            publicUser(user)
          );
      }
    );

    /*
     * WEBRTC OFFER
     */

    socket.on(
      "offer",
      ({ target, offer }) => {
        if (!target || !offer) return;

        io.to(target).emit(
          "offer",
          {
            from: socket.id,
            offer,
          }
        );
      }
    );

    /*
     * WEBRTC ANSWER
     */

    socket.on(
      "answer",
      ({ target, answer }) => {
        if (!target || !answer)
          return;

        io.to(target).emit(
          "answer",
          {
            from: socket.id,
            answer,
          }
        );
      }
    );

    /*
     * ICE CANDIDATE
     */

    socket.on(
      "ice-candidate",
      ({ target, candidate }) => {
        if (!target || !candidate)
          return;

        io.to(target).emit(
          "ice-candidate",
          {
            from: socket.id,
            candidate,
          }
        );
      }
    );

    /*
     * MIC / CAMERA / HAND / SCREEN STATE
     */

    socket.on(
      "media-state",
      (state = {}) => {
        const roomId =
          socket.data.roomId;

        const room =
          rooms.get(roomId);

        const user =
          room?.users.get(
            socket.id
          );

        if (!user) return;

        if (
          typeof state.micOn ===
          "boolean"
        ) {
          user.micOn =
            state.micOn;
        }

        if (
          typeof state.cameraOn ===
          "boolean"
        ) {
          user.cameraOn =
            state.cameraOn;
        }

        if (
          typeof state.handRaised ===
          "boolean"
        ) {
          user.handRaised =
            state.handRaised;
        }

        if (
          typeof state.screenSharing ===
          "boolean"
        ) {
          user.screenSharing =
            state.screenSharing;
        }

        socket
          .to(roomId)
          .emit(
            "media-state",
            {
              socketId:
                socket.id,

              micOn:
                user.micOn,

              cameraOn:
                user.cameraOn,

              handRaised:
                user.handRaised,

              screenSharing:
                user.screenSharing,
            }
          );
      }
    );

    /*
     * CHAT
     */

    socket.on(
      "chat-message",
      (message = {}) => {
        const roomId =
          socket.data.roomId;

        const room =
          rooms.get(roomId);

        if (
          !room ||
          !room.chatEnabled
        ) {
          return;
        }

        const text = String(
          message.text || ""
        ).trim();

        if (
          !text ||
          text.length > 1000
        ) {
          return;
        }

        const user =
          room.users.get(
            socket.id
          );

        if (!user) return;

        io.to(roomId).emit(
          "chat-message",
          {
            id: `${Date.now()}-${socket.id}`,

            from: socket.id,

            name: user.name,

            email: user.email,

            text,

            type: "text",

            time: Date.now(),
          }
        );
      }
    );

    /*
     * SMALL FILE SHARING
     */

    socket.on(
      "chat-file",
      (file = {}) => {
        const roomId =
          socket.data.roomId;

        const room =
          rooms.get(roomId);

        const user =
          room?.users.get(
            socket.id
          );

        if (
          !room ||
          !user ||
          !room.chatEnabled
        ) {
          return;
        }

        /*
         * Max 2 MB.
         * Production mein object storage use karna better hai.
         */

        if (
          !file.name ||
          !file.data ||
          Number(file.size) >
            2 * 1024 * 1024
        ) {
          return;
        }

        io.to(roomId).emit(
          "chat-file",
          {
            id: `${Date.now()}-${socket.id}`,

            from: socket.id,

            name: String(
              file.name
            ).slice(0, 150),

            type: String(
              file.type ||
                "application/octet-stream"
            ),

            size:
              Number(file.size) || 0,

            data: file.data,

            sender: user.name,

            time: Date.now(),
          }
        );
      }
    );

    /*
     * HOST CONTROLS
     */

    socket.on(
      "host-action",
      ({
        action,
        targetSocketId,
      }) => {
        const roomId =
          socket.data.roomId;

        const room =
          rooms.get(roomId);

        const actor =
          room?.users.get(
            socket.id
          );

        if (
          !room ||
          !actor ||
          !["host", "cohost"].includes(
            actor.role
          )
        ) {
          return;
        }

        /*
         * LOCK
         */

        if (
          action === "lock" &&
          actor.role === "host"
        ) {
          room.locked = true;

          io.to(roomId).emit(
            "meeting-settings",
            {
              locked: true,
            }
          );

          return;
        }

        /*
         * UNLOCK
         */

        if (
          action === "unlock" &&
          actor.role === "host"
        ) {
          room.locked = false;

          io.to(roomId).emit(
            "meeting-settings",
            {
              locked: false,
            }
          );

          return;
        }

        const target =
          room.users.get(
            targetSocketId
          );

        if (!target) return;

        /*
         * REMOVE
         */

        if (action === "remove") {
          io.to(
            targetSocketId
          ).emit(
            "removed-from-meeting",
            {
              message:
                "You were removed by the host.",
            }
          );

          io.sockets.sockets
            .get(targetSocketId)
            ?.disconnect(true);

          return;
        }

        /*
         * MUTE
         */

        if (action === "mute") {
          io.to(
            targetSocketId
          ).emit("force-mute");

          return;
        }

        /*
         * CO-HOST
         */

        if (
          action === "cohost" &&
          actor.role === "host"
        ) {
          target.role =
            "cohost";

          io.to(roomId).emit(
            "participant-role",
            {
              socketId:
                targetSocketId,

              role: "cohost",
            }
          );
        }
      }
    );

    /*
     * PERMISSIONS
     */

    socket.on(
      "permission-settings",
      ({
        chatEnabled,
        screenShareEnabled,
      }) => {
        const roomId =
          socket.data.roomId;

        const room =
          rooms.get(roomId);

        const actor =
          room?.users.get(
            socket.id
          );

        if (
          !room ||
          !actor ||
          actor.role !== "host"
        ) {
          return;
        }

        if (
          typeof chatEnabled ===
          "boolean"
        ) {
          room.chatEnabled =
            chatEnabled;
        }

        if (
          typeof screenShareEnabled ===
          "boolean"
        ) {
          room.screenShareEnabled =
            screenShareEnabled;
        }

        io.to(roomId).emit(
          "meeting-settings",
          {
            chatEnabled:
              room.chatEnabled,

            screenShareEnabled:
              room.screenShareEnabled,
          }
        );
      }
    );

    /*
     * LEAVE
     */

    socket.on(
      "leave-room",
      () => {
        cleanupSocket(socket);
      }
    );

    /*
     * DISCONNECT
     */

    socket.on(
      "disconnect",
      () => {
        cleanupSocket(socket);
      }
    );

    function cleanupSocket(
      currentSocket
    ) {
      const roomId =
        currentSocket.data.roomId;

      const room =
        rooms.get(roomId);

      if (!room) return;

      const user =
        room.users.get(
          currentSocket.id
        );

      room.users.delete(
        currentSocket.id
      );

      if (user) {
        io.to(roomId).emit(
          "participant-left",
          {
            socketId:
              currentSocket.id,

            email: user.email,
          }
        );
      }

      /*
       * If host leaves,
       * promote next participant.
       */

      if (
        room.hostSocketId ===
        currentSocket.id
      ) {
        const nextHost = [
          ...room.users.values(),
        ][0];

        room.hostSocketId =
          nextHost?.socketId ||
          null;

        if (nextHost) {
          nextHost.role =
            "host";

          io.to(roomId).emit(
            "participant-role",
            {
              socketId:
                nextHost.socketId,

              role: "host",
            }
          );
        }
      }

      if (
        room.users.size === 0
      ) {
        rooms.delete(roomId);
      }
    }
  });
};