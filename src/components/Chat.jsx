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
  const [duoPickerOpen, setDuoPickerOpen] = useState(false);
  const [duoProblems, setDuoProblems] = useState([]);
  const [duoProblemQuery, setDuoProblemQuery] = useState("");
  const [duoProblemId, setDuoProblemId] = useState("");
  const [duoRandomDifficulty, setDuoRandomDifficulty] = useState("any"); // any|easy|medium|hard

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
      let problem = null;

      if (duoProblemId === "__random__") {
        const pool = duoProblems.filter((p) => {
          if (!p?._id) return false;
          if (duoRandomDifficulty === "any") return true;
          return String(p.difficulty || "").toLowerCase() === duoRandomDifficulty;
        });
        if (pool.length === 0) {
          setSendError("No problems match that difficulty. Try a different difficulty.");
          return;
        }
        problem = pool[Math.floor(Math.random() * pool.length)];
      } else {
        problem = duoProblems.find((p) => p._id === duoProblemId);
      }

      if (!problem?._id) {
        setSendError("Pick a problem (or Random) before sending a Duo invite.");
        return;
      }
      const minutes = 20;
      const startAt = Date.now();

      const createGameResponse = await fetch("/api/together/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_id: problem._id,
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
      duoUrl.searchParams.set("problemId", problem._id);
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
          content: `Duo invite: ${problem.title}`,
          message_type: "duo_invite",
          meta: {
            game_id: gameId,
            problem_id: problem._id,
            problem_title: problem.title,
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
      setDuoPickerOpen(false);
    } catch (error) {
      console.error("Error sending duo invite:", error);
      setSendError("Unable to send duo invite.");
    }
  };

  const ensureDuoProblemsLoaded = async () => {
    if (duoProblems.length > 0) return;
    try {
      setLoading(true);
      const problemsResponse = await fetch("/api/problems");
      const problemsData = await problemsResponse.json();
      if (!problemsResponse.ok || !Array.isArray(problemsData) || problemsData.length === 0) {
        setSendError("No problems available for Duo invites.");
        setLoading(false);
        return;
      }
      setDuoProblems(problemsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading problems:", error);
      setSendError("Unable to load problems for Duo invites.");
      setLoading(false);
    }
  };

  const visibleDuoProblems = useMemo(() => {
    const q = duoProblemQuery.trim().toLowerCase();
    if (!q) return duoProblems;
    return duoProblems.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [duoProblems, duoProblemQuery]);

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
                if (status?.game_status === "cancelled") {
                  statusText = "Cancelled";
                } else if (status?.players) {
                  const solvedCount = Object.values(status.players).filter((player) => player.solved).length;
                  if (solvedCount === 2) statusText = "Both solved";
                  else if (solvedCount === 1) statusText = "One solved";
                  else statusText = "In progress";
                }

                const analysisStatus = message.meta?.analysis_status || "none";
                const analysis = message.meta?.analysis || null;
                const analysisSummary =
                  analysis?.solve_times?.summary ||
                  analysis?.coding_style?.comparison?.romantic_verdict ||
                  analysis?.text ||
                  null;

                return (
                  <div
                    key={message._id}
                    className="message-item duo"
                  >
                    <p><strong>Duo</strong></p>
                    <p><i>{message.meta.problem_title || "Random Problem"}</i></p>
                    <p><i>Status: {statusText}</i></p>
                    <p><b><a href={message.meta.invite_url} target="_blank">Open challenge</a></b></p>
                    {analysisStatus === "generating" && (
                      <p className="muted"><i>Analysis: generating…</i></p>
                    )}
                    {analysisStatus === "done" && analysisSummary && (
                      <div className="result-box" style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Cupid's Analysis</div>
                        <div>{analysisSummary}</div>
                      </div>
                    )}
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
              <button
                type="button"
                onClick={async () => {
                  setSendError("");
                  const next = !duoPickerOpen;
                  setDuoPickerOpen(next);
                  if (next) await ensureDuoProblemsLoaded();
                }}
              >
                Duo
              </button>
            </form>
            {duoPickerOpen && (
              <div className="duo-picker">
                <div className="duo-picker-row">
                  <input
                    type="text"
                    value={duoProblemQuery}
                    onChange={(e) => setDuoProblemQuery(e.target.value)}
                    placeholder="Search problem title…"
                  />
                  <select
                    value={duoProblemId}
                    onChange={(e) => setDuoProblemId(e.target.value)}
                  >
                    <option value="">Select a problem…</option>
                    <option value="__random__">Random (choose difficulty)</option>
                    {visibleDuoProblems.slice(0, 50).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={duoRandomDifficulty}
                    onChange={(e) => setDuoRandomDifficulty(e.target.value)}
                    disabled={duoProblemId !== "__random__"}
                    title={duoProblemId === "__random__" ? "Random difficulty" : "Select Random to enable"}
                  >
                    <option value="any">Any</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <button type="button" onClick={handleSendDuoInvite} disabled={!duoProblemId}>
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuoPickerOpen(false);
                      setDuoProblemQuery("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {sendError && <div className="chat-send-error">{sendError}</div>}
          </>
        ) : (
          <div className="chat-empty">Select a conversation or search a user to start chatting.</div>
        )}
      </section>
    </div>
  );
}
