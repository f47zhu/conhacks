import { useState, useEffect } from "react";
import "./styles.css";
import ProblemsList from "./components/ProblemsList";
import ProblemEditor from "./components/ProblemEditor";

export default function App() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await fetch("/api/problems");
      const data = await response.json();
      setProblems(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching problems:", error);
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Coode</h1>
      </header>
      <div className="app-content">
        {loading ? (
          <div className="loading">Loading problems...</div>
        ) : selectedProblem ? (
          <ProblemEditor
            problem={selectedProblem}
            onBack={() => setSelectedProblem(null)}
          />
        ) : (
          <ProblemsList
            problems={problems}
            onSelectProblem={setSelectedProblem}
          />
        )}
      </div>
    </div>
  );
}