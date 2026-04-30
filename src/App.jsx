import { useState, useEffect } from "react";
import "./App.css";
import ProblemsList from "./components/ProblemsList";
import ProblemEditor from "./components/ProblemEditor";
import Login from "./components/Login";
import Register from "./components/Register";
import DatingProfile from "./components/DatingProfile";
import UserProfiles from "./components/UserProfiles";
import Chat from "./components/Chat";
import TogetherSolve from "./components/TogetherSolve";
import logo from "./assets/logo.png";

export default function App() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('problems'); // 'problems', 'users', 'chat', 'dating-profile', 'login', 'register'
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [togetherMode, setTogetherMode] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const isTogether = params.get("page") === "together" && !!params.get("session") && !!params.get("problemId");
    setTogetherMode(isTogether);
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

  const handleLogin = async (token, userData) => {
    localStorage.setItem('token', token);
    setLoading(true);
    await fetchCurrentUser(token);
  };

  const handleRegister = async (token, userData) => {
    localStorage.setItem('token', token);
    setLoading(true);
    await fetchCurrentUser(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('login');
    setSelectedProblem(null);
  };

  const handleStartChatWithUser = (targetUser) => {
    setChatTargetUser(targetUser);
    setSelectedProblem(null);
    setPage("chat");
  };

  const handleProfileUpdated = (updatedProfile) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      return {
        ...currentUser,
        profile: updatedProfile,
      };
    });
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

  if (togetherMode) {
    return (
      <div className="app-container">
        <div className="app-content">
          <TogetherSolve
            user={user}
            onExit={() => {
              const url = new URL(window.location.href);
              url.search = "";
              window.history.replaceState({}, "", url.toString());
              setTogetherMode(false);
              setPage("chat");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <img src={logo} alt="Coode Logo" className="logo" />
          <h1>Coode</h1>
          <nav className="main-nav">
            <button
              className={`nav-btn ${page === "problems" ? "active" : ""}`}
              onClick={() => {
                setPage("problems");
                setSelectedProblem(null);
              }}
            >
              Problems
            </button>
            <button
              className={`nav-btn ${page === "users" ? "active" : ""}`}
              onClick={() => {
                setPage("users");
                setSelectedProblem(null);
              }}
            >
              Users
            </button>
            <button
              className={`nav-btn ${page === "chat" ? "active" : ""}`}
              onClick={() => {
                setPage("chat");
                setSelectedProblem(null);
              }}
            >
              Chat
            </button>
            <button
              className={`nav-btn ${page === "dating-profile" ? "active" : ""}`}
              onClick={() => {
                setPage("dating-profile");
                setSelectedProblem(null);
              }}
            >
              Profile
            </button>
          </nav>
        </div>
        <div className="user-section">
          <span className="username">{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <div className="app-content">
        {page === "dating-profile" ? (
          <DatingProfile user={user} onProfileUpdated={handleProfileUpdated} />
        ) : page === "chat" ? (
          <Chat user={user} initialChatUser={chatTargetUser} />
        ) : page === "users" ? (
          <UserProfiles
            currentUserId={user.id}
            onStartChatWithUser={handleStartChatWithUser}
          />
        ) : selectedProblem ? (
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
