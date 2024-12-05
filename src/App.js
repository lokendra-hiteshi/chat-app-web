import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Paper,
  useMediaQuery,
  Avatar,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import io from "socket.io-client";
import axios from "axios";
import ControlPointIcon from "@mui/icons-material/ControlPoint";

const isProduction = window.location.hostname !== "localhost";
const backendURL = isProduction
  ? "http://192.168.100.186:5000"
  : "http://localhost:5000";

const socket = io(backendURL);

function App() {
  const messagesEndRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState({});
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [openDialog, setOpenDialog] = useState(
    !localStorage.getItem("userInfo")
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const storedUserInfo = JSON.parse(localStorage.getItem("userInfo"));

    if (storedUserInfo) {
      setUserInfo(storedUserInfo);
      setUserId(storedUserInfo.id);
      setUserName(storedUserInfo.name);
    }
    if (storedUserInfo && storedUserInfo?.id) {
      registerUser();
    }
    axios.get(`${backendURL}/rooms`).then((res) => setRooms(res.data));
    axios.get(`${backendURL}/users`).then((res) => setUsers(res.data));

    if (storedUserInfo && currentChat) {
      axios
        .get(`${backendURL}/messages`, {
          params: {
            sender_id: storedUserInfo.id,
            recipient_id: currentChat?.type === "user" ? currentChat?.id : "",
            room_id: currentChat?.type === "room" ? currentChat?.id : "",
          },
        })
        .then((res) => setMessages(res.data));
    }

    socket.on("new_user", (user) => setUsers((prev) => [...prev, user]));
    socket.on("new_room", (room) => setRooms((prev) => [...prev, room]));
    socket.on("receive_private_message", (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    socket.on("receive_room_message", (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    return () => {
      socket.off("new_user");
      socket.off("new_room");
      socket.off("receive_private_message");
      socket.off("receive_room_message");
    };
  }, [socket.id, currentChat]);

  const registerUser = () => {
    const storedUserInfo = JSON.parse(localStorage.getItem("userInfo"));
    axios
      .post(`${backendURL}/users`, {
        userId: storedUserInfo?.id,
        name: storedUserInfo ? storedUserInfo.name : userName,
        socketId: socket.id,
      })
      .then((res) => {
        const userData = {
          id: res.data.id,
          name: res.data.name,
        };

        if (!storedUserInfo?.id) {
          setUserId(userData.id);
          setUserName(userData.name);
          setOpenDialog(false);
          socket.emit("register_user", userData);
        }

        localStorage.setItem("userInfo", JSON.stringify(userData));
      })
      .catch((error) => console.error("Error registering user:", error));
  };
  const joinRoom = (room) => {
    setCurrentChat({ type: "room", ...room });
    socket.emit("join_room", { roomId: room.id, userId });
    setMessages([]);
    setDrawerOpen(false);
  };

  const selectUser = (user) => {
    setCurrentChat({ type: "user", ...user });
    setMessages([]);
    setDrawerOpen(false);
  };

  const createRoom = () => {
    const roomName = prompt("Enter room name");
    if (roomName) {
      axios
        .post(`${backendURL}/rooms`, { name: roomName })
        .catch((error) => console.error("Error creating room:", error));
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      if (currentChat?.type === "room") {
        socket.emit("send_room_message", {
          sender_id: userId,
          sender_info: userInfo,
          room_id: currentChat.id,
          content: message,
        });
      } else if (currentChat?.type === "user") {
        socket.emit("send_private_message", {
          sender_id: userId,
          sender_info: userInfo,
          recipient_id: currentChat.id,
          content: message,
        });
        let messageContent = {
          sender_id: userId,
          recipient_id: currentChat.id,
          content: message,
        };
        setMessages((prevMessages) => [...prevMessages, messageContent]);
      }
      setMessage("");
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const SidebarContent = () => {
    const currentUserId = userId;

    return (
      <Box padding={2}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: 4,
          }}
        >
          <Avatar sx={{ bgcolor: "#FF5722" }}>
            {userInfo?.name?.charAt(0)}
          </Avatar>
          <Typography variant="h6">{userInfo?.name}</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Typography variant="h6">Rooms</Typography>
          <Tooltip title="Create Room">
            <IconButton variant="contained" fullWidth onClick={createRoom}>
              <ControlPointIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <List>
          {rooms.map((room) => (
            <ListItem
              button
              key={room?.id}
              onClick={() => joinRoom(room)}
              sx={{
                backgroundColor: currentChat?.id === room?.id ? "#F1F0E8" : "",
              }}
            >
              <ListItemText primary={room?.name} sx={{ cursor: "pointer" }} />
            </ListItem>
          ))}
        </List>
        <Typography variant="h6">Users</Typography>
        <List>
          {users
            .filter((user) => user.id !== currentUserId)
            .map((user) => (
              <ListItem
                button
                key={user?.id}
                onClick={() => selectUser(user)}
                sx={{
                  backgroundColor:
                    currentChat?.id === user?.id ? "#F1F0E8" : "",
                }}
              >
                <ListItemText primary={user?.name} sx={{ cursor: "pointer" }} />
              </ListItem>
            ))}
        </List>
      </Box>
    );
  };

  return (
    <Box display="flex" height="100vh">
      {!isMobile && (
        <Box
          width="300px"
          borderRight="1px solid #ddd"
          style={{ overflowY: "auto" }}
        >
          <SidebarContent />
        </Box>
      )}

      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <SidebarContent />
        </Drawer>
      )}

      <Box flexGrow={1} display="flex" flexDirection="column">
        {isMobile && (
          <AppBar position="static">
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Typography variant="h6">Chat App</Typography>
                <Avatar sx={{ bgcolor: "#FF5722" }}>
                  {userInfo?.name?.charAt(0)}
                </Avatar>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Box padding={2} flexGrow={1} display="flex" flexDirection="column">
          <Typography variant="h6" gutterBottom>
            Chat with {currentChat?.name || "Select a user or room"}
          </Typography>
          <Paper
            style={{
              flexGrow: 1,
              padding: "10px",
              overflowY: "auto",
              border: "1px solid #ddd",
              height: "400px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {messages.map((msg, idx) => {
              const isCurrentUser = msg?.sender_id === userId;
              return (
                <Box
                  key={idx}
                  textAlign={isCurrentUser ? "right" : "left"}
                  marginY={1}
                >
                  <Box
                    style={{
                      display: "inline-block",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: isCurrentUser ? "#d1f0d1" : "#f1f1f1",
                      maxWidth: "70%",
                    }}
                  >
                    {!isCurrentUser && (
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "12px", color: "red" }}
                      >
                        {msg?.sender_info?.name}
                      </Typography>
                    )}

                    <Typography variant="body2">{msg?.content}</Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Paper>

          <Box display="flex" marginTop={2}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              style={{ marginLeft: "10px" }}
            >
              Send
            </Button>
          </Box>
        </Box>

        <Dialog open={openDialog}>
          <DialogTitle>Register</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="User Name"
              fullWidth
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={registerUser} color="primary" disabled={!userName}>
              Register
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

export default App;
