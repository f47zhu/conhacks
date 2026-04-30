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
  const [sendError, setSendError] = useState("");
  const [duoStatuses, setDuoStatuses] = useState({});

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

  useEffect(() => {
    const inviteGameIds = messages
      .filter((message) => message.message_type === "duo_invite" && message.meta?.game_id)
      .map((message) => message.meta.game_id);
    const uniqueGameIds = [...new Set(inviteGameIds)];
    if (uniqueGameIds.length === 0) return;

    const pollStatuses = async () => {
      const next = {};
      for (const gameId of uniqueGameIds) {
        try {
          const response = await fetch(`/api/together/${gameId}/status`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (!response.ok) continue;
          next[gameId] = data;
        } catch (error) {
          console.error("Error loading duo status:", error);
        }
      }
      if (Object.keys(next).length > 0) {
        setDuoStatuses((current) => ({ ...current, ...next }));
      }
    };

    pollStatuses();
    const id = window.setInterval(pollStatuses, 4000);
    return () => window.clearInterval(id);
  }, [messages, token]);

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
    setSendError("");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChatUser || !messageText.trim()) return;

    try {
      setSendError("");
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
      if (!response.ok) {
        setSendError(data.error || "Unable to send message.");
        return;
      }

      setMessages((current) => [...current, data]);
      setMessageText("");
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      setSendError("Unable to send message.");
    }
  };

  const handleSendDuoInvite = async () => {
    if (!selectedChatUser) return;

    try {
      setSendError("");
      const problemsResponse = await fetch("/api/problems");
      const problemsData = await problemsResponse.json();
      if (!problemsResponse.ok || !Array.isArray(problemsData) || problemsData.length === 0) {
        setSendError("Unable to create invite: no problems available.");
        return;
      }

      const randomProblem = problemsData[Math.floor(Math.random() * problemsData.length)];
      const minutes = 20;
      const startAt = Date.now();

      const createGameResponse = await fetch("/api/together/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_id: randomProblem._id,
          guest_id: selectedChatUser.id,
          minutes,
        }),
      });
      const createGameData = await createGameResponse.json();
      if (!createGameResponse.ok) {
        setSendError(createGameData.error || "Unable to create duo game.");
        return;
      }

      const gameId = createGameData.game_id;
      const duoUrl = new URL(`${window.location.origin}/`);
      duoUrl.searchParams.set("page", "together");
      duoUrl.searchParams.set("session", gameId);
      duoUrl.searchParams.set("problemId", randomProblem._id);
      duoUrl.searchParams.set("minutes", String(minutes));
      duoUrl.searchParams.set("start", String(startAt));
      duoUrl.searchParams.set("host", user.id);
      duoUrl.searchParams.set("guest", selectedChatUser.id);

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedChatUser.id,
          content: `Duo invite: ${randomProblem.title}`,
          message_type: "duo_invite",
          meta: {
            game_id: gameId,
            problem_id: randomProblem._id,
            problem_title: randomProblem.title,
            minutes,
            invite_url: duoUrl.toString(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSendError(data.error || "Unable to send duo invite.");
        return;
      }

      setMessages((current) => [...current, data]);
      fetchConversations();
    } catch (error) {
      console.error("Error sending duo invite:", error);
      setSendError("Unable to send duo invite.");
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
              {messages.map((message) => {
                const isDuoInvite = message.message_type === "duo_invite" && message.meta?.invite_url;
                if (!isDuoInvite) {
                  return (
                    <div
                      key={message._id}
                      className={`message-item ${message.sender_id === user.id ? "mine" : "theirs"}`}
                    >
                      <p>{message.content}</p>
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  );
                }

                const status = duoStatuses[message.meta.game_id];
                let statusText = "Pending...";
                if (status?.players) {
                  const solvedCount = Object.values(status.players).filter((player) => player.solved).length;
                  if (solvedCount === 2) statusText = "Both solved";
                  else if (solvedCount === 1) statusText = "One solved";
                  else statusText = "In progress";
                }

                return (
                  <div
                    key={message._id}
                    className={`message-item ${message.sender_id === user.id ? "mine" : "theirs"}`}
                  >
                    <p><strong>Duo</strong></p>
                    <p><i>{message.meta.problem_title || "Random Problem"}</i></p>
                    <p><i>Status: {statusText}</i></p>
                    <p><b><a href={message.meta.invite_url}>Open challenge</a></b></p>
                    <span>{new Date(message.created_at).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            <form className="chat-input-row" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message"
              />
              <button type="submit">Send</button>
              <button type="button" onClick={handleSendDuoInvite}>
                Duo
              </button>
            </form>
            {sendError && <div className="chat-send-error">{sendError}</div>}
          </>
        ) : (
          <div className="chat-empty">Select a conversation or search a user to start chatting.</div>
        )}
      </section>
    </div>
  );
}
