import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCheckDouble, faTrash } from '@fortawesome/free-solid-svg-icons';
import { EmailContext as AuthContext } from "../contexts/EmailContext";
import "./ChatApp.css";
import { useNavigate } from "react-router-dom";
import server, { API_BASE } from "../environment";

const SOCKET_URL = server;

function Chat() {
  const navigate = useNavigate();
  const { email } = useContext(AuthContext);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();

  const [message, setMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [requestSent, setRequestSent] = useState(false);
  const [chats, setChats] = useState({});
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);

  const [selectedUser, setSelectedUser] = useState(() => {
    const saved = localStorage.getItem("selectedUser");
    return saved ? JSON.parse(saved) : null;
  });

  // Listen for saved message update from server
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("message-saved", (savedMessage) => {
      const otherUserEmail = savedMessage.from === email ? savedMessage.to : savedMessage.from;

      setChats((prevChats) => {
        const existingThread = prevChats[otherUserEmail] || [];
        const updatedThread = [...existingThread];

        for (let i = updatedThread.length - 1; i >= 0; i--) {
          const msg = updatedThread[i];
          if (
            msg.from === savedMessage.from &&
            msg.to === savedMessage.to &&
            msg.timestamp === savedMessage.timestamp &&
            !msg._id
          ) {
            updatedThread[i] = savedMessage;
            break;
          }
        }

        return {
          ...prevChats,
          [otherUserEmail]: updatedThread,
        };
      });
    });

    return () => {
      socketRef.current.off("message-saved");
    };
  }, [email]);

  // Persist selected user in localStorage
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem("selectedUser", JSON.stringify(selectedUser));
    }
  }, [selectedUser]);

  // Setup socket connection and listeners
  useEffect(() => {
    if (!email) return;

    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current.emit("set_email", email);
    socketRef.current.emit("join", { email });

    socketRef.current.on("receive_message", (msg) => {
      const key = msg.from === email ? msg.to : msg.from;
      setChats((prev) => {
        const conv = prev[key] || [];
        return {
          ...prev,
          [key]: [...conv, msg],
        };
      });
    });
    
    socketRef.current.on("new_connection_request", (data) => {
      setConnectionRequests((prev) => [...prev, data.fromEmail]);
    });
socketRef.current.on("message-saved", (savedMessage) => {
    const otherUserEmail = savedMessage.from === email ? savedMessage.to : savedMessage.from;

    setChats((prevChats) => {
      const existingThread = prevChats[otherUserEmail] || [];
      const updatedThread = [...existingThread];

      for (let i = updatedThread.length - 1; i >= 0; i--) {
        const msg = updatedThread[i];
        if (
          msg.from === savedMessage.from &&
          msg.to === savedMessage.to &&
          msg.timestamp === savedMessage.timestamp &&
          !msg._id
        ) {
          updatedThread[i] = savedMessage;
          break;
        }
      }

      return { ...prevChats, [otherUserEmail]: updatedThread };
    });
  });
      socketRef.current.on("message-deleted", (deletedId) => {
    setChats((prevChats) => {
      const updatedChats = { ...prevChats };
      Object.keys(updatedChats).forEach((userEmail) => {
        updatedChats[userEmail] = updatedChats[userEmail].filter(
          (msg) => msg._id !== deletedId
        );
      });
      return updatedChats;
    });
  });
    return () => {
    if (socketRef.current) {
      socketRef.current.off("message-saved");
      socketRef.current.off("message-deleted");
      socketRef.current.off("receive_message");
      socketRef.current.off("new_connection_request");
      socketRef.current.disconnect();
    }
  };
  }, [email]);
  // Fetch contacts
  useEffect(() => {
    if (!email) return;

    const fetchContacts = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/users/${encodeURIComponent(email)}/contacts`
        );

        const contactsFormatted = Array.isArray(data.contacts)
          ? data.contacts.map((c) => (typeof c === "string" ? { email: c } : c))
          : [];
        setConnectedUsers(contactsFormatted);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
        setConnectedUsers([]);
      }
    };

    fetchContacts();
  }, [email]);

  // Fetch connection requests
  useEffect(() => {
    if (!email) return;

    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/users/${encodeURIComponent(email)}/connection-requests`
        );

        if (Array.isArray(data.connectionRequests)) {
          setConnectionRequests(data.connectionRequests);
        } else {
          console.warn("Connection requests data is not an array:", data);
          setConnectionRequests([]);
        }
      } catch (err) {
        console.error("Failed to fetch connection requests:", err);
        setConnectionRequests([]);
      }
    })();
  }, [email]);

  // Fetch chat history with selected user and mark messages as read
  useEffect(() => {
    if (!selectedUser || !email) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/messages/${encodeURIComponent(email)}/${encodeURIComponent(selectedUser.email)}`
        );
        const messages = res.data.messages || [];

        setChats((prev) => ({
          ...prev,
          [selectedUser.email]: messages,
        }));

        // Mark messages as read
        await axios.post(`${API_BASE}/messages/mark-read`, {
          user1: email,
          user2: selectedUser.email,
        });
        socketRef.current.emit("mark_messages_read", {
          user1: email,
          user2: selectedUser.email,
        });
        setChats((prev) => {
        const updated = { ...prev };
        const thread = updated[selectedUser.email] || [];

        updated[selectedUser.email] = thread.map((msg) => {
          if (msg.to === email && !msg.read) {
            return { ...msg, read: true, delivered: true };
          }
          return msg;
        });
         return updated;
      });
        
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    fetchMessages();
  }, [selectedUser, email]);

  // Scroll chat to bottom when current thread updates
  const currentThread = selectedUser && chats[selectedUser.email] ? chats[selectedUser.email] : [];
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentThread]);
 const handleFileChange = (e) => {
  if (e.target.files && e.target.files[0]) {
    console.log("Selected file:", e.target.files[0]); // ✅ Debug line
    setFile(e.target.files[0]);
  }
};

const getFileType = (file) => {
  if (file.type.startsWith("image/")) {
    return file.type === "image/gif" ? "gif" : "image";
  } else if (file.type.startsWith("video/")) {
    return "video";
  } else if (file.type.startsWith("audio/")) {
    return "audio";
  } else if (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "file";
  }
  return "file";
};
const sendFileToServer = async (file) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("sender", email);
  formData.append("recipient", selectedUser.email);
  formData.append("type", getFileType(file));

  const res = await axios.post(
    `${API_BASE}/send-file`,
    formData
  );

  return res.data;
};
const sendMessage = async () => {
  if (!message.trim() && !file) return;
  if (!selectedUser) return;
  if (!socketRef.current) return;

  const timestamp = new Date();

  if (file) {
    const res = await sendFileToServer(file);

    const savedMessage = res.data;
  socketRef.current.emit("send_message", savedMessage);
    setChats((prev) => {
      const updated = { ...prev };
      const thread = updated[selectedUser.email] || [];

      updated[selectedUser.email] = [...thread, savedMessage];
      return updated;
    });

    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = null;

    return;
  }

  const newMessage = {
    from: email,
    to: selectedUser.email,
    content: message,
    type: "text",
    timestamp,
  };

  socketRef.current.emit("send_message", newMessage);

  setChats((prev) => {
    const updated = { ...prev };
    const thread = updated[selectedUser.email] || [];

    updated[selectedUser.email] = [...thread, newMessage];
    return updated;
  });

  setMessage("");
};
// Update message read/delivered status
useEffect(() => {
  if (!socketRef.current) return;

  socketRef.current.on("messages_read_update", ({ from, to }) => {
    setChats((prev) => {
      const updatedChats = { ...prev };

      Object.keys(updatedChats).forEach((key) => {
        updatedChats[key] = updatedChats[key].map((msg) => {
          if (msg.from === from && msg.to === to) {
            return { ...msg, read: true, delivered: true };
          }
          return msg;
        });
      });

      return updatedChats;
    });
  });

  return () => {
    if (socketRef.current) socketRef.current.off("messages_read_update");
  };
}, []);


  // Search user to connect
  const handleSearch = async () => {
    const trimmedSearchEmail = searchEmail.trim().toLowerCase();
    if (!trimmedSearchEmail) return;

    if (trimmedSearchEmail === email.toLowerCase()) {
      alert("You cannot search or connect to your own email.");
      return;
    }

    if (connectionRequests.includes(trimmedSearchEmail)) {
      alert("You have already sent a connection request to this user.");
      return;
    }

    try {
      const { data } = await axios.get(`${API_BASE}/users/search`, {
        params: { email: trimmedSearchEmail },
      });

      setSearchResult(data);
      setRequestSent(false);
    } catch (err) {
      console.error("User not found:", err);
      alert("User does not exist");
      setSearchResult(null);
    }
  };

  // Send connection request
  const handleConnect = async () => {
    if (!searchResult) {
      console.log("No user selected to connect.");
      return;
    }

    if (searchResult.email.toLowerCase() === email.toLowerCase()) {
      alert("You cannot send a connection request to yourself.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/users/${encodeURIComponent(email)}/connection-requests`,
        { toEmail: searchResult.email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 || response.status === 201) {
        setRequestSent(true);
        alert("Request sent!");
        setSearchEmail("");
        setSearchResult(null);
      } else {
        console.warn("Unexpected response status:", response.status);
        alert("Failed to send connection request.");
      }
    } catch (error) {
      console.error("Failed to send connection request:", error.response?.data || error.message);
      alert("Error sending connection request.");
    }
  };

  // Accept connection request
  const handleAcceptRequest = async (requesterEmail) => {
    try {
      const res = await axios.post(
        `${API_BASE}/users/${encodeURIComponent(email)}/connection-requests/${encodeURIComponent(requesterEmail)}/accept`
      );

      if (res.status === 200) {
        alert(`Accepted connection request from ${requesterEmail}`);
        setConnectionRequests((prev) => prev.filter((req) => req !== requesterEmail));
        setConnectedUsers((prev) => [...prev, { email: requesterEmail }]);
      }
    } catch (error) {
      alert("Failed to accept connection request.");
    }
  };

  // Reject connection request
  const handleRejectRequest = async (requesterEmail) => {
    try {
      const res = await axios.delete(
        `${API_BASE}/users/${encodeURIComponent(email)}/connection-requests/${encodeURIComponent(requesterEmail)}/reject`
      );

      if (res.status === 200) {
        alert(`Rejected connection request from ${requesterEmail}`);
        setConnectionRequests((prev) => prev.filter((req) => req !== requesterEmail));
      }
    } catch (error) {
      alert("Failed to reject connection request.");
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactEmail) => {
    try {
      const response = await axios.delete(
        `${API_BASE}/users/${encodeURIComponent(email)}/contacts/${encodeURIComponent(contactEmail)}`
      );

      if (response.status === 200) {
        alert("Contact deleted successfully");
        setConnectedUsers((prev) => prev.filter((c) => c.email !== contactEmail));
        if (selectedUser?.email === contactEmail) {
          setSelectedUser(null);
        }
      }
    } catch (err) {
      console.error("Error deleting contact:", err);
      alert("Failed to delete contact");
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg) => {
    if (!msg._id) {
      console.warn("Cannot delete message without _id");
      return;
    }
    try {
      const res = await axios.delete(`${API_BASE}/messages/delete/${msg._id}`);
      if (res.data.success) {
        socketRef.current.emit("message-deleted", msg._id);
        setChats((prevChats) => {
          const userEmail = selectedUser?.email;
          if (!userEmail) return prevChats;

          const updatedThread = prevChats[userEmail]?.filter((m) => m._id !== msg._id) || [];

          return {
            ...prevChats,
            [userEmail]: updatedThread,
          };
        });
      } else {
        console.warn("Delete failed:", res.data.message);
      }
    } catch (err) {
      console.error("❌ Error deleting message:", err);
    }
  };
 
  return (
    <div className="chat-container">
      
      <div className="chat-wrapper">
        <aside className="chat-sidebar">
           {/* Go Back Button */}
      <button
        type="button"
        className="go-back-btn"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "15px",
          padding: "8px 16px",
          background: "linear-gradient(120deg, #a078d4, #7e5dbf)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ← Go Back
      </button>

          <div className="sidebar-header">
            <div
              className="user-profile-circle"
              title={email}
              onClick={() => navigate(`/profile/${encodeURIComponent(email)}`)}
            >
              {email.charAt(0).toUpperCase()}
            </div>

            <div className="notification-container">
  <button
    className="notification-button"
    onClick={() => setShowRequests((prev) => !prev)}
  >
    🔔
    {connectionRequests.length > 0 && (
      <span className="notification-badge">
        {connectionRequests.length}
      </span>
    )}
  </button>

  {showRequests && (
    <div className="notification-dropdown">
      <h4>Connection Requests</h4>
      {connectionRequests.length === 0 ? (
        <p>No pending requests</p>
      ) : (
        <ul className="request-list">
          {connectionRequests.map((reqEmail, index) => (
            <li key={index}>
              <span>{reqEmail}</span>
             <div className="request-actions">
              <button onClick={() => handleAcceptRequest(reqEmail)}>
                Accept
              </button>
              <button onClick={() => handleRejectRequest(reqEmail)}>
                Reject
              </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )}
</div>

          </div>

          <h3>Users</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email…"
              style={{ flex: 1 }}
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          {searchResult && (
            <div className="search-result">
              <p>
                <strong>Email:</strong> {searchResult.email}
              </p>
              {!requestSent ? (
                <button onClick={handleConnect}>Send Connection Request</button>
              ) : (
                <p>Request sent!</p>
              )}
            </div>
          )}

          <h3>Contacts</h3>
          <ul className="user-list">
            {connectedUsers.map((user) => {
              const unreadCount =
                (chats[user.email]?.filter(
                  (msg) => msg.to === email && !msg.read
                ).length) || 0;

              const initial = user.firstName
                ? user.firstName.charAt(0).toUpperCase()
                : user.email.charAt(0).toUpperCase();

              return (
                <li
                  key={user.email}
                  className={`user-item ${
                    selectedUser?.email === user.email ? "selected" : ""
                  }`}
                >
                  <div
                    className="user-circle"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent bubbling
                      navigate(`/profile/${encodeURIComponent(user.email)}`);
                    }}
                    title={user.email}
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.firstName || user.email}
                        loading="lazy"
                      />
                    ) : (
                      <span className="user-initial">{initial}</span>
                    )}
                  </div>
                  <span
                    className="user-email"
                    onClick={() =>
                      setSelectedUser((prev) =>
                        prev?.email === user.email ? null : user
                      )
                    }
                  >
                    {user.email}
                  </span>

                  {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}

                  <button
                    onClick={() => handleDeleteContact(user.email)}
                    style={{ marginLeft: 8, color: "red", cursor: "pointer" }}
                  >
                    delete
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="chat-main">
          {selectedUser ? (
            <>
              <h3>
                Chat with <span className="email-header">{selectedUser.email}</span>
              </h3>
              <div className="chat-messages">
               

                {chats[selectedUser.email]?.length === 0 ? (
                <p>No messages yet.</p>
              ) : (
                chats[selectedUser.email]?.map((msg, index) => (
                  <div
                    key={`${msg._id || index}-${msg.timestamp}`}
                    className={`chat-bubble ${msg.from === email ? 'sent' : 'received'}`}
                  >
                    {msg.type === "text" ? (
                      <span>{msg.content}</span>
                    ) : msg.type === "image" ? (
                      <img src={msg.content} alt="Sent image" style={{ maxWidth: "200px", borderRadius: "8px" }} />
                    ) : msg.type === "video" ? (
                      <video controls style={{ maxWidth: "250px", borderRadius: "8px" }}>
                        <source src={msg.content} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : msg.type === "audio" ? (
                      <audio controls>
                        <source src={msg.content} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : msg.type === "gif" ? (
                      <img src={msg.content} alt="GIF" style={{ maxWidth: "200px", borderRadius: "8px" }} />
                    ) : msg.type === "file" ? (
                      <a
                        href={msg.content}
                        download={`file_${msg._id || index}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#00bcd4", textDecoration: "underline" }}
                      >
                        📎 Download file
                      </a>
                    ) : (
                      <span>Unsupported file type</span>
                    )
                  }

                  <div className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
            
                    {msg.from === email && (
                      <>
                        <span className="tick-status">
                          {msg.read ? (
                            <FontAwesomeIcon icon={faCheckDouble} className="tick read-icon" />
                          ) : msg.delivered ? (
                            <FontAwesomeIcon icon={faCheckDouble} className="tick delivered-icon" />
                          ) : (
                            <FontAwesomeIcon icon={faCheck} className="tick sent-icon" />
                          )}
                        </span>
            
                        {msg._id && (
                          <button
                            onClick={() => handleDeleteMessage(msg)}
                            style={{
                              marginLeft: 5,
                              color: "red",
                              cursor: "pointer",
                              background: "none",
                              border: "none",
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
              </div>
             {file && (
             <div className="file-preview" style={{ padding: "5px 10px", background: "#f0f0f0", margin: "10px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <p style={{ margin: 0 }}>📎 File: <strong>{file.name}</strong></p>
               <button onClick={() => setFile(null)} style={{ border: "none", background: "none", color: "red", cursor: "pointer" }}>❌</button>
             </div>
           )}
              <div className="chat-input">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                />
                  <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  ref={fileInputRef}
                />              
                <button onClick={() => fileInputRef.current.click()}>📎</button>
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          ) : (
            <p>Select a contact to start chatting</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default Chat;