import "./ProblemsList.css";

export default function ProblemsList({ problems, onSelectProblem }) {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "#52c41a";
      case "medium":
        return "#faad14";
      case "hard":
        return "#f5222d";
      default:
        return "#1890ff";
    }
  };

  return (
    <div className="problems-list">
      <div className="problems-header">
        <h2>Problems</h2>
        <p className="problems-count">{problems.length} problems</p>
      </div>
      <div className="problems-table">
        <div className="table-header">
          <div className="col-status">#</div>
          <div className="col-title">Title</div>
          <div className="col-difficulty">Difficulty</div>
          <div className="col-acceptance">Acceptance</div>
        </div>
        {problems.map((problem, index) => (
          <div
            key={problem._id}
            className="table-row"
            onClick={() => onSelectProblem(problem)}
          >
            <div className="col-status">{index + 1}</div>
            <div className="col-title">
              <a href="#" className="problem-title">
                {problem.title}
              </a>
            </div>
            <div className="col-difficulty">
              <span
                className="difficulty-badge"
                style={{ color: getDifficultyColor(problem.difficulty) }}
              >
                {problem.difficulty}
              </span>
            </div>
            <div className="col-acceptance">
              {problem.acceptance}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
