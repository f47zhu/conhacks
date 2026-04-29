import { useEffect, useMemo, useState } from "react";
import "./Chat.css";

export default function Chat({ user, initialChatUser }) {
  const [conversations, setConversations] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!initialChatUser?.id) return;
    openChat(initialChatUser);
  }, [initialChatUser]);

  useEffect(() => {
    if (!selectedChatUser) return;

    fetchMessages(selectedChatUser.id);
    const intervalId = window.setInterval(() => {
      fetchMessages(selectedChatUser.id);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [selectedChatUser]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/chat/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) return;
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await fetch(`/api/chat/messages/${otherUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) return;
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const filtered = (data || []).filter((candidate) => candidate._id !== user.id);
      setSearchResults(filtered);
      setLoading(false);
    } catch (error) {
      console.error("Error searching users:", error);
      setLoading(false);
    }
  };

  const openChat = (chatUser) => {
    const normalized = {
      id: chatUser.id || chatUser.user_id || chatUser._id,
      username: chatUser.username,
    };
    setSelectedChatUser(normalized);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChatUser || !messageText.trim()) return;

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedChatUser.id,
          content: messageText.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) return;

      setMessages((current) => [...current, data]);
      setMessageText("");
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <h2>Chat</h2>

        <form className="chat-search" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find user by username"
          />
          <button type="submit" disabled={loading}>{loading ? "..." : "Find"}</button>
        </form>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((candidate) => (
              <button
                key={candidate._id}
                className="chat-user-btn"
                onClick={() => openChat(candidate)}
              >
                {candidate.username}
              </button>
            ))}
          </div>
        )}

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.user_id}
              className={`conversation-btn ${selectedChatUser?.id === conversation.user_id ? "active" : ""}`}
              onClick={() => openChat({ id: conversation.user_id, username: conversation.username })}
            >
              <div className="conversation-name">{conversation.username}</div>
              <div className="conversation-preview">{conversation.last_message}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        {selectedChatUser ? (
          <>
            <div className="chat-header">{selectedChatUser.username}</div>
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`message-item ${message.sender_id === user.id ? "mine" : "theirs"}`}
                >
                  <p>{message.content}</p>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <form className="chat-input-row" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message"
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="chat-empty">Select a conversation or search a user to start chatting.</div>
        )}
      </section>
    </div>
  );
}
