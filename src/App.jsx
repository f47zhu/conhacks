import { useState, useEffect } from "react";
import "./App.css";
import ProblemsList from "./components/ProblemsList";
import ProblemEditor from "./components/ProblemEditor";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('problems'); // 'problems', 'login', 'register'

  useEffect(() => {
    // Check if user is logged in (token in localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && page === 'problems') {
      fetchProblems();
    }
  }, [user, page]);

  const fetchCurrentUser = async (token) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setPage('problems');
        fetchProblems();
      } else {
        localStorage.removeItem('token');
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      localStorage.removeItem('token');
      setLoading(false);
    }
  };

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

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setPage('problems');
    setLoading(false);
  };

  const handleRegister = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setPage('problems');
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('login');
    setSelectedProblem(null);
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="auth-container">
        {page === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setPage('register')} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={() => setPage('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Coode</h1>
        <div className="user-section">
          <span className="username">{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <div className="app-content">
        {selectedProblem ? (
          <ProblemEditor
            problem={selectedProblem}
            onBack={() => setSelectedProblem(null)}
            user={user}
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