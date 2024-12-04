import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import io from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

function App() {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [openDialog, setOpenDialog] = useState(
    !localStorage.getItem("userName")
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (localStorage.getItem("userName")) {
      const storedName = localStorage.getItem("userName");
      setUserName(storedName);

      axios
        .post("http://localhost:5000/users", {
          name: storedName,
          socketId: socket.id,
        })
        .then((res) => {
          setUserId(res.data.id); // Ensure userId is set
        })
        .catch((error) => console.error("Error registering user:", error));
    }

    axios.get("http://localhost:5000/rooms").then((res) => setRooms(res.data));
    axios.get("http://localhost:5000/users").then((res) => setUsers(res.data));

    socket.on("new_user", (user) => setUsers((prev) => [...prev, user]));
    socket.on("new_room", (room) => setRooms((prev) => [...prev, room]));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    socket.on("receive_private_message", (msg) =>
      setMessages((prev) => [...prev, msg])
    );
    socket.on("receive_room_message", (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    return () => {
      socket.off("receive_private_message");
      socket.off("receive_room_message");
    };
  }, []);

  const registerUser = () => {
    if (userName.trim()) {
      localStorage.setItem("userName", userName);

      axios
        .post("http://localhost:5000/users", {
          name: userName,
          socketId: socket.id,
        })
        .then((res) => {
          setUserId(res.data.id);
          setOpenDialog(false);
        });
    }
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
      axios.post("http://localhost:5000/rooms", { name: roomName });
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      if (currentChat.type === "room") {
        socket.emit("send_room_message", {
          senderId: userId,
          roomId: currentChat.id,
          content: message,
        });
      } else {
        socket.emit("send_private_message", {
          senderId: userId,
          recipientId: currentChat.id,
          content: message,
        });
      }

      setMessage("");
    }
  };

  const SidebarContent = () => (
    <Box padding={2}>
      <Typography variant="h6">Rooms</Typography>
      <Button variant="contained" fullWidth onClick={createRoom}>
        Create Room
      </Button>
      <List>
        {rooms.map((room) => (
          <ListItem button key={room.id} onClick={() => joinRoom(room)}>
            <ListItemText primary={room.name} />
          </ListItem>
        ))}
      </List>
      <Typography variant="h6">Users</Typography>
      <List>
        {users.map((user) => (
          <ListItem button key={user.id} onClick={() => selectUser(user)}>
            <ListItemText primary={user.name} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box display="flex" height="100vh">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <Box
          width="300px"
          borderRight="1px solid #ddd"
          style={{ overflowY: "auto" }}
        >
          <SidebarContent />
        </Box>
      )}

      {/* Drawer for Mobile */}
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
        {/* App Bar */}
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
              <Typography variant="h6">Chat App</Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Chat Area */}
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
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                textAlign={msg.senderId === userId ? "right" : "left"}
                marginY={1}
              >
                <Typography
                  variant="body2"
                  style={{
                    display: "inline-block",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor:
                      msg.senderId === userId ? "#d1f0d1" : "#f1f1f1",
                    maxWidth: "70%",
                  }}
                >
                  {msg.content}
                </Typography>
              </Box>
            ))}
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

        {/* User Registration Dialog */}
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
            <Button onClick={registerUser} color="primary">
              Register
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

export default App;
