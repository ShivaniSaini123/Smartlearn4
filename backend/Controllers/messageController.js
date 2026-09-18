const Conversation = require('../models/Message');

const encodeEmail = (email) => email.replace(/\./g, ',');

function createParticipantsKey(participants) {
  return participants.join('-');
}

exports.saveMessage = async (msgData, recipientOnline, io) => {
  try {
    const from = msgData.from.trim().toLowerCase();
    const to = msgData.to.trim().toLowerCase();
    const content = msgData.content;
    const type = msgData.type || 'text';
    const timestamp = msgData.timestamp || new Date();

    if (!from || !to || !content) {
      console.error('❌ Missing required fields: from, to, or content');
      return;
    }

    const allowedTypes = ['text', 'image', 'gif', 'audio', 'video', 'file'];
    if (!allowedTypes.includes(type)) {
      console.error(`❌ Invalid message type: ${type}`);
      return;
    }

    console.log(`Saving message with type: ${type} from: ${from} to: ${to}`);

    const participants = [from, to].sort();
    const participantsKey = createParticipantsKey(participants);

    let conversation = await Conversation.findOne({ participantsKey });

    if (!conversation) {
      conversation = new Conversation({
        participants,
        participantsKey,
        messages: [],
      });
    }

    conversation.messages.push({
      from,
      to,
      content,
      type,
      timestamp,
      delivered: false,
      read: recipientOnline ? true : false,
    });

    const toKey = encodeEmail(to);
    const currentUnread = conversation.unreadCounts.get(toKey) || 0;
    conversation.unreadCounts.set(toKey, recipientOnline ? 0 : currentUnread + 1);

    const saved = await conversation.save();
    const lastMessage = saved.messages[saved.messages.length - 1];

    if (io) {
      io.to(to).emit("receive_message", lastMessage);
      io.to(from).emit("message_saved", lastMessage);
      // Legacy compatibility
      io.to(to).emit("receive-message", lastMessage);
      io.to(from).emit("message-saved", lastMessage);
    }

    return lastMessage;
  } catch (error) {
    console.error('❌ Error saving message:', error);
  }
};


exports.getMessagesBetweenUsers = async (req, res) => {
  const user1 = req.params.user1.trim().toLowerCase();
  const user2 = req.params.user2.trim().toLowerCase();

  const participants = [user1, user2].sort();
  const participantsKey = createParticipantsKey(participants);

  try {
    const conversation = await Conversation.findOne({ participantsKey });

    if (!conversation) {
      console.log('📭 No conversation found for:', participants);
      return res.json({ messages: [] });
    }

    res.json({ messages: conversation.messages });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
exports.markMessagesRead = async (user1Raw, user2Raw) => {
  if (!user1Raw || !user2Raw) {
    console.error("Missing user1Raw or user2Raw");
    return;
  }

  const user1 = user1Raw.trim().toLowerCase(); // Reader
  const user2 = user2Raw.trim().toLowerCase(); // Sender

  try {
    const participants = [user1, user2].sort();
    const participantsKey = createParticipantsKey(participants);
    const conversation = await Conversation.findOne({ participantsKey });

    if (!conversation) return;

    let hasChanges = false;

    conversation.messages.forEach((msg) => {
      if (msg.to === user1 && msg.from === user2 && !msg.read) {
        msg.read = true;
        hasChanges = true;
      }
    });

    const userKey = encodeEmail(user1);
    if (conversation.unreadCounts.has(userKey) && conversation.unreadCounts.get(userKey) !== 0) {
      conversation.unreadCounts.set(userKey, 0);
      hasChanges = true;
    }

    if (hasChanges) {
      await conversation.save();
      console.log(`✅ Marked messages as read for ${user1}`);
    }
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
  }
};

// MARK MESSAGES AS DELIVERED (✔✔ Grey)
exports.markMessagesDelivered = async (user1Raw, user2Raw) => {
  const user1 = user1Raw.trim().toLowerCase(); // Receiver
  const user2 = user2Raw.trim().toLowerCase(); // Sender

  try {
    const participants = [user1, user2].sort();
    const participantsKey = createParticipantsKey(participants);
    const conversation = await Conversation.findOne({ participantsKey });

    if (!conversation) return;

    let hasChanges = false;

    conversation.messages.forEach((msg) => {
      if (msg.to === user1 && !msg.delivered) {
        msg.delivered = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await conversation.save();
      console.log(`✅ Marked messages as delivered for ${user1}`);
    }
  } catch (error) {
    console.error("❌ Error marking messages as delivered:", error);
  }
};

// GET TOTAL UNREAD MESSAGE COUNT
exports.getUnreadCountsPerSender = async (userIdRaw) => {
  const userId = userIdRaw.trim().toLowerCase();
  const userKey = encodeEmail(userId);

  try {
    const conversations = await Conversation.find({ participants: userId });

    const unreadPerSender = {};

    conversations.forEach((conv) => {
      const count = conv.unreadCounts.get(userKey) || 0;

      if (count > 0) {
        const sender = conv.participants.find(p => p !== userId);
        unreadPerSender[sender] = count;
      }
    });

    return unreadPerSender;
  } catch (error) {
    console.error("❌ Error getting unread per sender:", error);
    return {};
  }
};
exports.deleteMessageById = async (messageIdRaw) => {
  const messageId = messageIdRaw.trim();

  try {
    const conversation = await Conversation.findOne({ "messages._id": messageId });

    if (!conversation) {
      console.warn("⚠️ Message not found in any conversation:", messageId);
      return { success: false, message: "Message not found" };
    }

    // Remove the message from the array
    conversation.messages = conversation.messages.filter(
      (msg) => msg._id.toString() !== messageId
    );

    await conversation.save();

    return { success: true, message: "Message deleted", id: messageId };
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return { success: false, message: "Server error", error };
  }
};

exports.deleteMessageController = async (req, res) => {
  const { messageId } = req.params;

  const result = await exports.deleteMessageById(messageId);

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(404).json(result);
  }
};

