// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const Filter = require("bad-words");
const jwt = require("jsonwebtoken");
const db = require("./db");
const aiInsightsRouter = require("./routes/insights.js").default;

const authRoutes = require("./routes/auth");
const {
  addUserSocket,
  removeUserSocket,
  getUserSocket,
  getUsersInRoom,
} = require("./utils/users");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// ---------- Middleware ----------
const allowedOrigins = [
  "http://localhost:3001",
  "https://chatapp-frontend-2f2sdg1af-abdelrazikehabs-projects.vercel.app",
  "https://chatapp-frontend-one-khaki.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ---------- Routes ----------
app.use("/api/auth", authRoutes);

// Example: Fetch messages in a room
app.get("/api/messages/:room", async (req, res) => {
  const room = req.params.room;
  try {
    const result = await db.query(
      `
      SELECT m.*, u.name AS sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE room = $1
      ORDER BY created_at ASC
      LIMIT 100
      `,
      [room]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ---------- Socket Auth ----------
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query?.token;
    if (!token) return next(new Error("Authentication error"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      "SELECT id, name, email FROM users WHERE id=$1",
      [payload.id]
    );
    if (result.rows.length === 0) return next(new Error("User not found"));

    socket.user = result.rows[0];
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

// ---------- Socket.io Events ----------
io.on("connection", (socket) => {
  console.log("✅ New WebSocket connected:", socket.user.email);

  socket.on("join", async (options, callback) => {
    const { username, room } = options;
    const { error, user } = addUserSocket({
      id: socket.id,
      username,
      room,
    });
    if (error) return callback(error);

    socket.join(user.room);

    // send chat history
    try {
      const res = await db.query(
        `
        SELECT m.*, u.name AS sender_name
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE room=$1
        ORDER BY created_at ASC
        LIMIT 100
        `,
        [user.room]
      );
      socket.emit("roomHistory", res.rows);
    } catch (e) {
      console.error("Error loading history:", e);
    }

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("SendMessage", async (messageText, callback) => {
    const filter = new Filter();
    if (filter.isProfane(messageText))
      return callback("Profanity is not allowed");

    const user = getUserSocket(socket.id);
    if (!user) return callback("User not found");

    try {
      await db.query(
        "INSERT INTO messages (sender_id, room, text) VALUES ($1, $2, $3)",
        [socket.user.id, user.room, messageText]
      );
    } catch (err) {
      console.error("DB insert error:", err);
    }

    io.to(user.room).emit(
      "message",
      generateMessage(user.username, messageText)
    );
    callback();
  });

  socket.on("SendLocation", async (coords, callback) => {
    const user = getUserSocket(socket.id);
    if (!user) return callback("User not found");

    const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
    try {
      await db.query(
        "INSERT INTO messages (sender_id, room, text) VALUES ($1, $2, $3)",
        [socket.user.id, user.room, `[location] ${url}`]
      );
    } catch (err) {
      console.error("DB insert location error:", err);
    }

    io.to(user.room).emit(
      "locationmessage",
      generateLocationMessage(user.username, url)
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUserSocket(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

app.use("/api/ai/insights", aiInsightsRouter);

// ---------- Start Server ----------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
