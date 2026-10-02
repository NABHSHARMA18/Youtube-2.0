import crypto from "crypto";
import Meeting from "../Modals/meeting.js";

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const createRoomId = () =>
  crypto.randomBytes(6).toString("hex").toUpperCase();

export const createMeeting = async (req, res) => {
  try {
    const hostEmail = normalizeEmail(req.body.hostEmail);

    const hostName = String(
      req.body.hostName || "Host"
    ).trim();

    const title = String(
      req.body.title || "Video Meeting"
    ).trim();

    const maxParticipants = Math.min(
      Math.max(
        Number(req.body.maxParticipants) || 6,
        2
      ),
      12
    );

    if (!hostEmail) {
      return res.status(400).json({
        message: "Host email is required.",
      });
    }

    let roomId = createRoomId();

    while (await Meeting.exists({ roomId })) {
      roomId = createRoomId();
    }

    const meeting = await Meeting.create({
      roomId,
      hostEmail,
      hostName,
      title,
      maxParticipants,

      participants: [
        {
          email: hostEmail,
          name: hostName,
          role: "host",
          trusted: true,
        },
      ],
    });

    return res.status(201).json({
      success: true,

      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        hostEmail: meeting.hostEmail,
        maxParticipants: meeting.maxParticipants,
        locked: meeting.locked,
      },
    });
  } catch (error) {
    console.error(
      "CREATE MEETING ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to create meeting.",
    });
  }
};

export const getMeeting = async (req, res) => {
  try {
    const roomId = String(
      req.params.roomId
    )
      .trim()
      .toUpperCase();

    const meeting = await Meeting.findOne({
      roomId,
      active: true,
    }).lean();

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,

      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        hostEmail: meeting.hostEmail,
        hostName: meeting.hostName,
        locked: meeting.locked,
        maxParticipants:
          meeting.maxParticipants,
        chatEnabled:
          meeting.chatEnabled,
        screenShareEnabled:
          meeting.screenShareEnabled,
      },
    });
  } catch (error) {
    console.error(
      "GET MEETING ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to load meeting.",
    });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const roomId = String(
      req.params.roomId
    )
      .trim()
      .toUpperCase();

    const email = normalizeEmail(
      req.body.email
    );

    const meeting = await Meeting.findOne({
      roomId,
      active: true,
    });

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found.",
      });
    }

    if (meeting.hostEmail !== email) {
      return res.status(403).json({
        message:
          "Only the host can update meeting settings.",
      });
    }

    if (req.body.locked !== undefined) {
      meeting.locked = Boolean(
        req.body.locked
      );
    }

    if (
      req.body.chatEnabled !== undefined
    ) {
      meeting.chatEnabled = Boolean(
        req.body.chatEnabled
      );
    }

    if (
      req.body.screenShareEnabled !==
      undefined
    ) {
      meeting.screenShareEnabled =
        Boolean(
          req.body.screenShareEnabled
        );
    }

    if (
      req.body.maxParticipants !==
      undefined
    ) {
      meeting.maxParticipants =
        Math.min(
          Math.max(
            Number(
              req.body.maxParticipants
            ) || 6,
            2
          ),
          12
        );
    }

    meeting.lastActivityAt = new Date();

    await meeting.save();

    return res.status(200).json({
      success: true,

      meeting: {
        roomId: meeting.roomId,
        locked: meeting.locked,
        chatEnabled:
          meeting.chatEnabled,
        screenShareEnabled:
          meeting.screenShareEnabled,
        maxParticipants:
          meeting.maxParticipants,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE MEETING ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update meeting.",
    });
  }
};