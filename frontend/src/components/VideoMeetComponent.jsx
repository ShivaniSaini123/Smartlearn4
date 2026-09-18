import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import server from '../environment';

import {
  Badge,
  Button,
  IconButton,
  TextField,
} from '@mui/material';

import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

import styles from './videoComponents.module.css';

const blackSilenceStream = () =>
  new MediaStream([
    Object.assign(
      document.createElement('canvas').captureStream().getVideoTracks()[0],
      { enabled: false }
    ),
    Object.assign(
      new AudioContext().createMediaStreamDestination().stream.getAudioTracks()[0],
      { enabled: false }
    ),
  ]);

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRefs = useRef({});
  const connections = useRef({});

  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessages, setNewMessages] = useState(0);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState('');

  const videoEnabledRef = useRef(videoEnabled);
  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => {
    videoEnabledRef.current = videoEnabled;
    audioEnabledRef.current = audioEnabled;
  }, [videoEnabled, audioEnabled]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!connected || !window.localStream) return;

    window.localStream.getVideoTracks().forEach((track) => {
      track.enabled = videoEnabled;
    });

    window.localStream.getAudioTracks().forEach((track) => {
      track.enabled = audioEnabled;
    });
  }, [videoEnabled, audioEnabled, connected]);

  const replaceStream = (stream) => {
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    window.localStream = stream;

    Object.entries(connections.current).forEach(([id, peer]) => {
      const senders = peer.getSenders();

      // Remove old tracks
      senders.forEach((sender) => {
        if (!stream.getTracks().find((t) => t.kind === sender.track?.kind)) {
          peer.removeTrack(sender);
        }
      });
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.addTrack(track, stream);
        }
      });
    });
  };

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      replaceStream(stream);

      stream.getVideoTracks()[0].onended = async () => {
        try {
          const userMedia = await navigator.mediaDevices.getUserMedia({
            video: videoEnabledRef.current,
            audio: audioEnabledRef.current,
          });
          replaceStream(userMedia);
        } catch (err) {
          console.error("Reverting to webcam failed:", err);
        }
        setScreenEnabled(false);
      };
    } catch (err) {
      console.error('Screen share error:', err);
      setScreenEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (screenEnabled) {
      startScreenShare();
    }
  }, [screenEnabled, startScreenShare]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      window.localStream = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      connectSocket();
    } catch (err) {
      console.error('Media initialization error:', err);
    }
  };

  const connectSocket = () => {
    socketRef.current = io(server);
    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit('join-call', window.location.href, username);
    });
socketRef.current.on('user-joined', (id, clients, name) => {
  const joiningName = name || 'Someone';
  if (id !== socketRef.current.id) {
    showToast(`${joiningName} has joined the meeting`);
  }
      clients.forEach((socketId) => {
        if (!connections.current[socketId]) {
          const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });

          peer.onicecandidate = (e) => {
            if (e.candidate) {
              socketRef.current.emit('signal', socketId, JSON.stringify({ ice: e.candidate }));
            }
          };

          peer.ontrack = (e) => {
            const stream = e.streams[0];
            setVideos((prev) => {
              const exists = prev.some((v) => v.socketId === socketId);
              return exists
                ? prev.map((v) => (v.socketId === socketId ? { ...v, stream } : v))
                : [...prev, { socketId, stream }];
            });
          };

          const localStream = window.localStream || blackSilenceStream();
          localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

          connections.current[socketId] = peer;
        }
      });

      if (id === socketRef.current.id) {
        Object.entries(connections.current).forEach(([peerId, peer]) => {
          if (peerId !== socketRef.current.id) {
            peer.createOffer().then((desc) => {
              peer.setLocalDescription(desc);
              socketRef.current.emit('signal', peerId, JSON.stringify({ sdp: desc }));
            });
          }
        });
      }
    });
    socketRef.current.on('user-left', (id, name) => {
     showToast(`${name || 'Someone'} left the meeting`);

      setVideos((prev) => prev.filter((v) => v.socketId !== id));
      connections.current[id]?.close();
      delete connections.current[id];
      delete videoRefs.current[id];
    });

    socketRef.current.on('signal', async (fromId, message) => {
      const signal = JSON.parse(message);
      const peer = connections.current[fromId];
      if (!peer) return;

      if (signal.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: answer }));
        }
      }

      if (signal.ice) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(signal.ice));
        } catch (e) {
          console.error('ICE candidate error:', e);
        }
      }
    });

    socketRef.current.on('chat-message', (data, sender, senderId) => {
      setMessages((msgs) => [...msgs, { sender, data }]);
      if (senderId !== socketIdRef.current) setNewMessages((n) => n + 1);
    });
  };

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('chat-message', message, username);
      setMessage('');
    }
  };

  const endCall = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    Object.values(connections.current).forEach((conn) => conn.close());
    if (socketRef.current) socketRef.current.disconnect();
    window.location.href = '/dashboard';
  };

  return (
    <div>
      {!connected ? (
        <div>
          <h2>Join Meeting</h2>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={!username.trim()}
            onClick={() => {
              initializeMedia();
              setConnected(true);
            }}
          >
            Connect
          </Button>
          <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {chatOpen && (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <h1>Chat</h1>
                <div className={styles.chattingDisplay}>
                  {messages.length ? (
                    messages.map((msg, i) => (
                      <div key={i}>
                        <strong>{msg.sender}</strong>
                        <p>{msg.data}</p>
                      </div>
                    ))
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>
                <div className={styles.chattingArea}>
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    label="Enter message"
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.buttonContainers}>
            <IconButton onClick={() => setVideoEnabled(!videoEnabled)} style={{ color: 'white' }}>
              {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={endCall} style={{ color: 'red' }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={() => setAudioEnabled(!audioEnabled)} style={{ color: 'white' }}>
              {audioEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            <IconButton onClick={() => setScreenEnabled(!screenEnabled)} style={{ color: 'white' }}>
              {screenEnabled ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
            <Badge badgeContent={newMessages} color="error">
              <IconButton
                onClick={() => {
                  setChatOpen(!chatOpen);
                  if (!chatOpen) setNewMessages(0);
                }}
                style={{ color: 'white' }}
              >
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          <video ref={localVideoRef} autoPlay muted className={styles.meetUserVideo} />

          <div className={styles.conferenceView}>
            {videos.map((v) => (
              <video
                key={v.socketId}
                ref={(el) => {
                  if (el && v.stream) el.srcObject = v.stream;
                  videoRefs.current[v.socketId] = el;
                }}
                autoPlay
                playsInline
                className={styles.remoteVideo}
              />
            ))}
          </div>

          {toast && <div className={styles.toast}>{toast}</div>}
        </div>
      )}
    </div>
  );
}
