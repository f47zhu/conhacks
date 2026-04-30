import { useEffect, useMemo, useState } from "react";
import "./TogetherSolve.css";

export default function TogetherSolve({ user, onExit }) {
  const [problem, setProblem] = useState(null);
  const [session, setSession] = useState(null);
  const [code, setCode] = useState("def solution():\n    pass\n");
  const [submitStatus, setSubmitStatus] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [solvedTimeMs, setSolvedTimeMs] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    const sessionId = params.get("session");
    const problemId = params.get("problemId");
    const minutes = Number(params.get("minutes") || 20);
    const startAt = Number(params.get("start") || Date.now());
    const host = params.get("host") || "";
    const guest = params.get("guest") || "";

    if (page !== "together" || !sessionId || !problemId) return;

    setSession({ id: sessionId, problemId, minutes, startAt, host, guest });
  }, []);

  useEffect(() => {
    if (!session) return;

    const loadProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${encodeURIComponent(session.problemId)}`);
        const data = await response.json();
        if (!response.ok) {
          setSubmitStatus(data.error || "Failed to load problem.");
          return;
        }
        setProblem(data);
      } catch (error) {
        console.error("Error loading problem:", error);
      }
    };

    loadProblem();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const now = Date.now();
      const runningMs =
        solvedTimeMs !== null
          ? solvedTimeMs
          : Math.max(0, now - session.startAt);
      const totalSec = Math.floor(runningMs / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      setElapsedTime(`${mm}:${ss}`);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session, solvedTimeMs]);

  const submitAttempt = async () => {
    if (!problem) return;
    if (solvedTimeMs !== null) {
      setSubmitStatus("You already solved this challenge. Stopwatch is locked.");
      return;
    }

    try {
      setSubmitStatus("Submitting...");
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ problem_id: problem._id, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitStatus(data.error || "Submit failed.");
        return;
      }

      setLatestResult(data);
      if (typeof data.total === "number" && data.total > 0 && data.passed === data.total) {
        const finalTime = Math.max(0, Date.now() - session.startAt);
        setSolvedTimeMs(finalTime);
        localStorage.setItem(
          `together-solved-time-${session.id}-${user.id}`,
          String(finalTime)
        );
        const finalSec = Math.floor(finalTime / 1000);
        const mm = String(Math.floor(finalSec / 60)).padStart(2, "0");
        const ss = String(finalSec % 60).padStart(2, "0");
        setSubmitStatus(`Solved. Final time saved: ${mm}:${ss}`);
      } else {
        setSubmitStatus("Submission saved.");
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setSubmitStatus("Submit failed.");
    }
  };

  const sendProgressToChat = async () => {
    if (!session) {
      setSubmitStatus("Session is missing.");
      return;
    }
    if (!problem) {
      setSubmitStatus("Problem is still loading.");
      return;
    }
    if (!token) {
      setSubmitStatus("You must be logged in to send updates.");
      return;
    }

    const currentUserId = String(user?.id || "");
    const hostId = String(session.host || "");
    const guestId = String(session.guest || "");

    let receiverId = "";
    if (currentUserId && currentUserId === hostId) {
      receiverId = guestId;
    } else if (currentUserId && currentUserId === guestId) {
      receiverId = hostId;
    } else if (hostId && hostId !== currentUserId) {
      receiverId = hostId;
    } else if (guestId && guestId !== currentUserId) {
      receiverId = guestId;
    }

    if (!receiverId) {
      setSubmitStatus("Could not determine opponent to message. Open the latest invite link from chat.");
      return;
    }

    const progress = latestResult
      ? `${latestResult.passed}/${latestResult.total} passed`
      : "no submission yet";
    const solvedTimeText =
      solvedTimeMs !== null
        ? ` | final time ${String(Math.floor(solvedTimeMs / 60000)).padStart(2, "0")}:${String(Math.floor((solvedTimeMs % 60000) / 1000)).padStart(2, "0")}`
        : "";

    const url = window.location.href;

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          content: `Together update for ${problem.title}: ${progress}${solvedTimeText} | ${url}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitStatus(data.error || `Failed to send update (HTTP ${response.status}).`);
        return;
      }
      setSubmitStatus("Progress update sent in chat.");
    } catch (error) {
      console.error("Error sending update:", error);
      setSubmitStatus("Failed to send update.");
    }
  };

  useEffect(() => {
    if (!session || !user?.id) return;
    const saved = localStorage.getItem(`together-solved-time-${session.id}-${user.id}`);
    if (!saved) return;
    const savedMs = Number(saved);
    if (!Number.isNaN(savedMs) && savedMs >= 0) {
      setSolvedTimeMs(savedMs);
    }
  }, [session, user?.id]);

  if (!session) {
    return (
      <div className="together-wrap">
        <div className="together-card">
          <h2>Invalid Together Session</h2>
          <p>This page must be opened from a chat invite link.</p>
          <button onClick={onExit}>Back to App</button>
        </div>
      </div>
    );
  }

  return (
    <div className="together-wrap">
      <div className="together-card">
        <div className="together-header">
          <h2>Duo</h2>
          <button className="secondary" onClick={onExit}>Exit</button>
        </div>
        <p className="muted">Session: {session.id}</p>
      </div>

      <div className="together-grid">
        <div className="together-card">
          <h3>{problem?.title || "Loading problem..."}</h3>
          <p className="muted">
            Stopwatch: <strong>{elapsedTime}</strong>{" "}
            {solvedTimeMs !== null ? "(final)" : "(running)"}
          </p>
          <div
            className="problem-description"
            dangerouslySetInnerHTML={{ __html: problem?.description || "" }}
            style={{lineHeight: "1.6"}}
          />
        </div>

        <div className="together-card">
          <h3>Your Attempt</h3>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="row">
            <button onClick={submitAttempt} disabled={solvedTimeMs !== null}>Submit</button>
            <button className="secondary" onClick={sendProgressToChat}>Send Update</button>
          </div>
          {submitStatus && <p className="muted">{submitStatus}</p>}
          <div className="result-box">
            {latestResult ? (
              <>
                <div><strong>Passed:</strong> {latestResult.passed}/{latestResult.total}</div>
                <div><strong>Failed:</strong> {latestResult.failed}</div>
              </>
            ) : (
              <div>No submission yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
