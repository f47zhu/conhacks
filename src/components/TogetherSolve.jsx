import { useEffect, useMemo, useState } from "react";
import "./TogetherSolve.css";

export default function TogetherSolve({ user, onExit }) {
  const [problem, setProblem] = useState(null);
  const [session, setSession] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [code, setCode] = useState("def solution():\n    pass\n");
  const [submitStatus, setSubmitStatus] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [solvedTimeMs, setSolvedTimeMs] = useState(null);
  const [opponentStatus, setOpponentStatus] = useState(null);
  const [opponentCode, setOpponentCode] = useState(null);
  const [showOpponentCode, setShowOpponentCode] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [gameStatus, setGameStatus] = useState("active");
  const [cancelledBy, setCancelledBy] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    const sessionId = params.get("session");
    const problemId = params.get("problemId");
    const minutes = Number(params.get("minutes") || 20);
    const host = params.get("host") || "";
    const guest = params.get("guest") || "";

    if (page !== "together" || !sessionId || !problemId) return;

    const startKey = `together-start-${sessionId}-${user.id}`;
    const savedStartAt = localStorage.getItem(startKey);
    let startAt;

    if (savedStartAt) {
      startAt = Number(savedStartAt);
    } else {
      startAt = Date.now();
      localStorage.setItem(startKey, String(startAt));
    }

    setSession({ id: sessionId, problemId, minutes, startAt, host, guest });
  }, [user?.id]);

  // Retrieve game state from MongoDB and restore user's progress
  useEffect(() => {
    if (!gameId || !user?.id || gameLoaded) return;
    if (!token) {
      setGameLoaded(true);
      return;
    }

    const restoreGameState = async () => {
      try {
        const response = await fetch(`/api/together/${gameId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          console.error("Failed to load game state");
          setGameLoaded(true);
          return;
        }

        const data = await response.json();
        const currentUserId = String(user.id);

        if (data.players[currentUserId]) {
          const playerData = data.players[currentUserId];

          if ('code' in playerData && playerData.code !== null) {
            setCode(playerData.code);
          }

          if (playerData.test_results) {
            setLatestResult(playerData.test_results);
          }

          if (playerData.solved) {
            const serverMs = playerData.elapsed_ms;
            const localMs =
              Number(
                localStorage.getItem(
                  `together-solved-ms-${gameId}-${currentUserId}`
                )
              ) || null;
            const resolvedMs = serverMs ?? localMs ?? 0;
            setSolvedTimeMs(resolvedMs);

            // Backfill server if elapsed_ms was never persisted there
            if (serverMs == null && resolvedMs != null && token) {
              fetch(`/api/together/${gameId}/solution`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ elapsed_ms: resolvedMs }),
              }).catch(console.error);
            }
          }
        }

        setGameLoaded(true);
      } catch (error) {
        console.error("Error restoring game state:", error);
        setGameLoaded(true);
      }
    };

    restoreGameState();
  }, [gameId, user?.id, gameLoaded, token]);

  // Create or retrieve game in MongoDB
  useEffect(() => {
    if (!session || !user?.id || gameId) return;

    const initializeGame = async () => {
      try {
        setGameId(session.id);
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    };

    initializeGame();
  }, [session, user?.id, gameId]);

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

  // Poll for opponent status periodically
  useEffect(() => {
    if (!gameId || !token) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/together/${gameId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;

        const data = await response.json();
        setGameStatus(data.game_status || "active");
        setCancelledBy(data.cancelled_by || null);
        setAnalysisStatus(data.analysis_status || null);
        setAnalysisError(data.analysis_error || null);
        setAnalysis(data.analysis || null);
        const currentUserId = String(user?.id || "");

        for (const [userId, playerData] of Object.entries(data.players)) {
          if (userId !== currentUserId) {
            setOpponentStatus({
              username: playerData.username,
              solved: playerData.solved,
              solvedAt: playerData.solved_at,
              testResults: playerData.test_results,
            });

            if (playerData.solved && solvedTimeMs !== null && playerData.code) {
              setOpponentCode(playerData.code);
              setShowOpponentCode(true);
            }
            break;
          }
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    };

    const interval = window.setInterval(pollStatus, 2000);
    pollStatus();
    return () => window.clearInterval(interval);
  }, [gameId, token, user?.id, solvedTimeMs]);

  const submitAttempt = async () => {
    if (!problem) return;
    if (gameStatus === "cancelled") {
      setSubmitStatus("This duo game was cancelled.");
      return;
    }
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

      const isSolved =
        typeof data.total === "number" && data.total > 0 && data.passed === data.total;

      let finalTime = null;

      if (isSolved) {
        finalTime = Math.max(0, Date.now() - session.startAt);
        setSolvedTimeMs(finalTime);
        localStorage.setItem(
          `together-solved-ms-${session.id}-${user.id}`,
          String(finalTime)
        );
        const finalSec = Math.floor(finalTime / 1000);
        const mm = String(Math.floor(finalSec / 60)).padStart(2, "0");
        const ss = String(finalSec % 60).padStart(2, "0");
        setSubmitStatus(`Solved. Final time saved: ${mm}:${ss}`);
      } else {
        setSubmitStatus("Submission saved.");
      }

      if (gameId && token) {
        try {
          await fetch(`/api/together/${gameId}/solution`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              code,
              test_results: data,
              solved: isSolved,
              elapsed_ms: finalTime, // null when not solved, correct ms when solved
            }),
          });
        } catch (error) {
          console.error("Error updating game:", error);
        }
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setSubmitStatus("Submit failed.");
    }
  };

  const renderCupidAnalysis = (analysisJson) => {
    if (!analysisJson || typeof analysisJson !== "object") return null;
    const users = analysisJson.users || {};
    const hostName = users.host?.username || "Host";
    const guestName = users.guest?.username || "Guest";

    const solveTimes = analysisJson.solve_times || {};
    const coding = analysisJson.coding_style || {};

    const host = coding.host || {};
    const guest = coding.guest || {};
    const comparison = coding.comparison || {};

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Romantic verdict</div>
          <div>{comparison.romantic_verdict || "—"}</div>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Solve times</div>
          <div style={{ marginBottom: 6 }}>{solveTimes.summary || "—"}</div>
          <div className="result-box" style={{ background: "#fff", margin: 0 }}>
            <div>
              <strong>{hostName}:</strong>{" "}
              {solveTimes.host?.seconds != null ? `${solveTimes.host.seconds}s` : "unknown"}
            </div>
            <div>
              <strong>{guestName}:</strong>{" "}
              {solveTimes.guest?.seconds != null ? `${solveTimes.guest.seconds}s` : "unknown"}
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 700, marginBottom: 6 }}>Coding style</div>
        <div className="coding-style-grid">
          <div className="result-box" style={{ background: "#fff", margin: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{hostName}</div>
            <div><strong>Approach:</strong> {host.approach || "—"}</div>
            <div><strong>Time:</strong> {host.time_complexity || "—"}</div>
            <div><strong>Space:</strong> {host.space_complexity || "—"}</div>
            {host.summary ? (
              <div style={{ marginTop: 6 }}>
                <strong>Summary:</strong> {host.summary}
              </div>
            ) : null}
          </div>

          <div className="result-box" style={{ background: "#fff", margin: "10px 0 0" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{guestName}</div>
            <div><strong>Approach:</strong> {guest.approach || "—"}</div>
            <div><strong>Time:</strong> {guest.time_complexity || "—"}</div>
            <div><strong>Space:</strong> {guest.space_complexity || "—"}</div>
            {guest.summary ? (
              <div style={{ marginTop: 6 }}>
                <strong>Summary:</strong> {guest.summary}
              </div>
            ) : null}
          </div>
        </div>
        
        {Array.isArray(comparison.key_differences) && comparison.key_differences.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Comparison</div>
              {Array.isArray(comparison.key_differences) && comparison.key_differences.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Key differences:</strong>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {comparison.key_differences.slice(0, 6).map((s, i) => (
                      <li key={`kd-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
      </div>
    );
  };

  const analysisJson = useMemo(() => {
    if (!analysis) return null;
    if (analysis.json && typeof analysis.json === "object") return analysis.json;
    const text = analysis.text;
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) return null;
    try {
      const cleaned = trimmed.startsWith("```")
        ? trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim()
        : trimmed;
      return JSON.parse(cleaned);
    } catch (e) {
      return null;
    }
  }, [analysis]);

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

  if (!gameLoaded) {
    return (
      <div className="together-wrap">
        <div className="together-card">
          <h2>Loading game session...</h2>
          <p>Please wait while we restore your game state.</p>
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
        {gameStatus === "cancelled" && (
          <p className="muted" style={{ color: "#b42318" }}>
            This game was cancelled{cancelledBy ? ` by ${cancelledBy}` : ""}.
          </p>
        )}
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
            style={{ lineHeight: "1.6" }}
          />
        </div>

        <div className="together-card">
          <h3>Your Attempt</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={solvedTimeMs !== null || gameStatus === "cancelled"}
          />
          <div className="row">
            <button onClick={submitAttempt} disabled={solvedTimeMs !== null || gameStatus === "cancelled"}>
              Submit
            </button>
            {gameStatus !== "cancelled" && solvedTimeMs === null && (
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    setSubmitStatus("Cancelling...");
                    const resp = await fetch(`/api/together/${gameId}/cancel`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await resp.json();
                    if (!resp.ok) {
                      setSubmitStatus(data.error || "Unable to cancel.");
                      return;
                    }
                    setSubmitStatus("Cancelled.");
                    setGameStatus("cancelled");
                  } catch (e) {
                    setSubmitStatus("Unable to cancel.");
                  }
                }}
              >
                Cancel game
              </button>
            )}
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

        <div className="together-card">
          <h3>Opponent Status</h3>
          {opponentStatus ? (
            <>
              <p><strong>Player:</strong> {opponentStatus.username || "Loading..."}</p>
              <p>
                <strong>Status:</strong>{" "}
                {opponentStatus.solved ? (
                  <span style={{ color: "green" }}>✓ Solved</span>
                ) : (
                  <span style={{ color: "orange" }}>Still solving...</span>
                )}
              </p>
              {opponentStatus.testResults && (
                <div className="result-box">
                  <div><strong>Passed:</strong> {opponentStatus.testResults.passed}/{opponentStatus.testResults.total}</div>
                  <div><strong>Failed:</strong> {opponentStatus.testResults.failed}</div>
                </div>
              )}
              {showOpponentCode && opponentCode && (
                <div className="opponent-code-section">
                  <h4>Opponent's Solution</h4>
                  <pre style={{
                    backgroundColor: "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    overflow: "auto",
                    maxHeight: "200px",
                    fontSize: "12px",
                  }}>{opponentCode}</pre>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Waiting for opponent...</p>
          )}
        </div>
      </div>

      <div className="together-card">
        <h3>Cupid's Analysis</h3>
        {analysis ? (
          <div className="result-box" style={{ whiteSpace: "pre-wrap" }}>
            {analysisJson ? (
              renderCupidAnalysis(analysisJson)
            ) : (
              <pre style={{ margin: 0 }}>{analysis.text || "Analysis available."}</pre>
            )}
          </div>
        ) : analysisStatus === "generating" ? (
          <p className="muted">Generating analysis…</p>
        ) : analysisStatus === "error" ? (
          <p className="muted">
            Analysis failed to generate.
            {analysisError ? (
              <span style={{ display: "block", marginTop: 6, whiteSpace: "pre-wrap" }}>
                <strong>Error:</strong> {analysisError}
              </span>
            ) : null}
            {solvedTimeMs !== null && opponentStatus?.solved ? (
              <span style={{ display: "block", marginTop: 10 }}>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      const resp = await fetch(`/api/together/${gameId}/analysis/retry`, {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await resp.json();
                      if (!resp.ok) {
                        setSubmitStatus(data.error || "Unable to retry analysis.");
                        return;
                      }
                      setSubmitStatus("Retry queued.");
                      setAnalysisStatus("generating");
                    } catch (e) {
                      setSubmitStatus("Unable to retry analysis.");
                    }
                  }}
                >
                  Retry analysis
                </button>
              </span>
            ) : null}
          </p>
        ) : (
          <p className="muted">Analysis will appear once both players solve.</p>
        )}
      </div>
    </div>
  );
}