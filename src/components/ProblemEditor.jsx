import { useEffect, useState } from "react";
import "./ProblemEditor.css";

export default function ProblemEditor({ problem, onBack, user }) {
  const [code, setCode] = useState("def solution():\n    pass\n");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  useEffect(() => {
    fetchSubmissionHistory();
  }, [problem._id]);

  const fetchSubmissionHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/submissions?problem_id=${encodeURIComponent(problem._id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setHistoryLoading(false);
        return;
      }

      setSubmissionHistory(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setResults(data[0]);
        setSelectedSubmissionId(data[0]._id);
      } else {
        setResults(null);
        setSelectedSubmissionId(null);
      }
      setHistoryLoading(false);
    } catch (error) {
      console.error("Error fetching submission history:", error);
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: problem._id,
          code: code,
        }),
      });
      const data = await response.json();
      setResults(data);
      if (data && !data.error) {
        setSubmissionHistory((current) => [data, ...current]);
        setSelectedSubmissionId(data._id || null);
      }
      setActiveTab("results");
    } catch (error) {
      console.error("Error submitting solution:", error);
      setResults({ error: "Failed to submit solution" });
    }
    setSubmitting(false);
  };

  return (
    <div className="problem-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>{problem.title}</h2>
      </div>

      <div className="editor-container">
        <div className="problem-panel">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "description" ? "active" : ""}`}
              onClick={() => setActiveTab("description")}
            >
              Description
            </button>
            <button
              className={`tab ${activeTab === "results" ? "active" : ""}`}
              onClick={() => setActiveTab("results")}
            >
              Results
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "description" && (
              <div className="description">
                <div className="problem-info">
                  <span className="badge">{problem.difficulty}</span>
                  <span className="acceptance">
                    {problem.acceptance} acceptance
                  </span>
                </div>
                <div
                  className="description-text"
                  dangerouslySetInnerHTML={{
                    __html: problem.description || "No description available",
                  }}
                />
              </div>
            )}

            {activeTab === "results" && results && (
              <div className="results">
                {results.error ? (
                  <div className="error-message">{results.error}</div>
                ) : (
                  <>
                    <div className="results-header-row">
                      <h3>Saved Submissions</h3>
                    </div>
                    {historyLoading ? (
                      <div className="loading-history">Loading submissions...</div>
                    ) : submissionHistory.length > 0 ? (
                      <div className="submission-history">
                        {submissionHistory.map((submission, idx) => (
                          <div
                            key={submission._id || `${submission.submitted_at}-${idx}`}
                            className={`submission-item ${
                              selectedSubmissionId === submission._id ? "active" : ""
                            }`}
                          >
                            <button
                              className="submission-select-btn"
                              onClick={() => {
                                setResults(submission);
                                setSelectedSubmissionId(submission._id || null);
                              }}
                            >
                              <span>Run #{submissionHistory.length - idx}</span>
                              <span>
                                {submission.passed}/{submission.total} passed
                              </span>
                              <span>
                                {submission.submitted_at
                                  ? new Date(submission.submitted_at).toLocaleString()
                                  : "Just now"}
                              </span>
                            </button>
                            {submission.code && (
                              <pre className="submission-code">{submission.code}</pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="loading-history">No previous submissions yet.</div>
                    )}

                    <div className="result-summary">
                      <div className="result-stat">
                        <span className="label">Passed:</span>
                        <span className="value passed">
                          {results.passed}/{results.total}
                        </span>
                      </div>
                      <div className="result-stat">
                        <span className="label">Failed:</span>
                        <span className="value failed">
                          {results.failed}
                        </span>
                      </div>
                    </div>
                    <div className="test-cases">
                      {results.results?.map((result, idx) => (
                        <div
                          key={idx}
                          className={`test-case ${result.status}`}
                        >
                          <div className="test-case-header">
                            Test Case {idx + 1}:
                            <span className={`status-badge ${result.status}`}>
                              {result.status}
                            </span>
                          </div>
                          {result.input && (
                            <div className="test-case-detail">
                              <strong>Input:</strong> {JSON.stringify(result.input)}
                            </div>
                          )}
                          {result.expected && (
                            <div className="test-case-detail">
                              <strong>Expected:</strong> {JSON.stringify(result.expected)}
                            </div>
                          )}
                          {result.output !== undefined && (
                            <div className="test-case-detail">
                              <strong>Output:</strong> {JSON.stringify(result.output)}
                            </div>
                          )}
                          {result.error && (
                            <div className="test-case-detail error">
                              <strong>Error:</strong> {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="code-panel">
          <div className="code-header">
            <span>Solution</span>
            <select defaultValue="python">
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Write your solution here..."
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
