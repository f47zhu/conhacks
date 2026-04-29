import { useState } from "react";
import "./ProblemEditor.css";

export default function ProblemEditor({ problem, onBack, user }) {
  const [code, setCode] = useState("def solution():\n    pass\n");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("description");

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
