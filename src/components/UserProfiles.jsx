import { useState, useEffect } from "react";
import "./UserProfiles.css";

export default function UserProfiles({ currentUserId, onStartChatWithUser }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("leaderboard"); // 'leaderboard' or 'search'
  const [messageBlocked, setMessageBlocked] = useState(false);
  const [messageBlockReason, setMessageBlockReason] = useState("");

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users/leaderboard?limit=50");
      const data = await response.json();
      setLeaderboard(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const submittedQuery = searchQuery.trim();
    setLastSearchQuery(submittedQuery);

    try {
      setLoading(true);
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(submittedQuery)}`
      );
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error searching users:", error);
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/profile`);
      const data = await response.json();
      setUserProfile(data);
      setSelectedUser(userId);
      await evaluateMessageAccess(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setLoading(false);
    }
  };

  const evaluateMessageAccess = async (profileData) => {
    if (!profileData || profileData.id === currentUserId) {
      setMessageBlocked(false);
      setMessageBlockReason("");
      return;
    }

    const requiresSolve = !!profileData.profile?.restrictMessagesToFavouriteProblemSolvers;
    const favouriteProblemId = profileData.profile?.favouriteProblemId;
    const favouriteProblemLabel =
      profileData.profile?.favouriteProblemTitle ||
      profileData.profile?.favouriteProblem ||
      "their favourite problem";

    if (!requiresSolve || !favouriteProblemId) {
      setMessageBlocked(false);
      setMessageBlockReason("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessageBlocked(true);
        setMessageBlockReason(`You must solve ${favouriteProblemLabel} before messaging this user.`);
        return;
      }

      const response = await fetch(
        `/api/submissions?problem_id=${encodeURIComponent(favouriteProblemId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        setMessageBlocked(true);
        setMessageBlockReason(`You must solve ${favouriteProblemLabel} before messaging this user.`);
        return;
      }

      const solvedFavourite = data.some(
        (submission) =>
          typeof submission.total === "number" &&
          submission.total > 0 &&
          submission.passed === submission.total
      );

      setMessageBlocked(!solvedFavourite);
      setMessageBlockReason(
        solvedFavourite
          ? ""
          : `You must solve ${favouriteProblemLabel} before messaging this user.`
      );
    } catch (error) {
      console.error("Error checking message restrictions:", error);
      setMessageBlocked(true);
      setMessageBlockReason(`You must solve ${favouriteProblemLabel} before messaging this user.`);
    }
  };

  if (selectedUser && userProfile) {
    return (
      <div className="user-profiles">
        <button
          className="back-btn"
          onClick={() => {
            setSelectedUser(null);
            setUserProfile(null);
          }}
        >
          ← Back
        </button>
        <div className="profile-card">
          <h2>{userProfile.profile?.displayName ?
                userProfile.profile.displayName : userProfile.username}</h2>
          
          {userProfile.profile?.displayName && (
            <p className="age">
                <strong>Username:</strong> {userProfile.username}
            </p>
          )}

          {userProfile.age && <p className="age">Age: {userProfile.age}</p>}

          <p className="field-row" style={{ gridTemplateColumns: '1fr '.repeat(
              !!userProfile.profile?.location + !!userProfile.profile?.pronouns +
              !!userProfile.profile?.occupation + !!userProfile.profile?.relationshipGoal
          ) }}>
            {userProfile.profile?.location && (
              <p className="profile-field">
                <strong>📍 Location:</strong> {userProfile.profile.location}
              </p>
            )}
            {userProfile.profile?.pronouns && (
              <p className="profile-field">
                <strong>👥 Pronouns:</strong> {userProfile.profile.pronouns}
              </p>
            )}
            {userProfile.profile?.occupation && (
              <p className="profile-field">
                <strong>💼 Occupation:</strong> {userProfile.profile.occupation}
              </p>
            )}
            {userProfile.profile?.relationshipGoal && (
              <p className="profile-field">
                <strong>❤️ Relationship Goal:</strong> {userProfile.profile.relationshipGoal}
              </p>
            )}
          </p>
          
          <div className="field-row" style={{ gridTemplateColumns: '1fr '.repeat(
              !!userProfile.profile?.bio + !!userProfile.profile?.interests +
              !!userProfile.profile?.dealBreakers
          ) }}>
            {userProfile.profile?.bio && (
              <div className="profile-field bio-section">
                <strong>Bio:</strong>
                <p>{userProfile.profile.bio}</p>
              </div>
            )}
            {userProfile.profile?.interests && (
              <div className="profile-field interests-section">
                <strong>Interests:</strong>
                <p>{userProfile.profile.interests}</p>
              </div>
            )}
            {userProfile.profile?.dealBreakers && (
              <div className="profile-field dealbreakers-section">
                <strong>Deal Breakers:</strong>
                <p>{userProfile.profile.dealBreakers}</p>
              </div>
            )}
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr '.repeat(
              !!userProfile.profile?.favouriteProblemTopics + !!userProfile.profile?.elo +
              !!userProfile.profile?.favouriteProblem
          ) }}>
            {userProfile.profile?.favouriteProblemTopics && (
              <div className="profile-field">
                <strong>Favourite Problem Topics:</strong>
                <p>{userProfile.profile.favouriteProblemTopics}</p>
              </div>
            )}
            {userProfile.profile?.elo && (
              <div className="profile-field">
                <strong>Elo Rating / Coding Profiles:</strong>
                <p>{userProfile.profile.elo}</p>
              </div>
            )}
            {(userProfile.profile?.favouriteProblemTitle || userProfile.profile?.favouriteProblem) && (
              <div className="profile-field">
                <strong>Favourite Problem:</strong>
                <p>{userProfile.profile.favouriteProblemTitle || userProfile.profile.favouriteProblem}</p>
              </div>
            )}
          </div>
          
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">Problems Solved</span>
              <span className="stat-value">
                {userProfile.stats?.solved || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Attempts</span>
              <span className="stat-value">
                {userProfile.stats?.attempts || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accepted</span>
              <span className="stat-value">
                {userProfile.stats?.accepted || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Acceptance Rate</span>
              <span className="stat-value">
                {userProfile.stats?.attempts > 0
                  ? (
                      ((userProfile.stats?.accepted || 0) / userProfile.stats?.attempts) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>
          <p className="member-since">
            Member since{" "}
            {new Date(userProfile.created_at).toLocaleDateString()}
          </p>
          {userProfile.id !== currentUserId && (
            <>
            <br />
              <button
                className="search-btn"
                disabled={messageBlocked}
                onClick={() =>
                  onStartChatWithUser({
                    id: userProfile.id,
                    username: userProfile.username,
                  })
                }
              >
                Message {userProfile.username}
              </button>
              {messageBlocked && (
                <p className="no-results" style={{ marginTop: "10px" }}>
                  {messageBlockReason}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-profiles">
      <div className="profiles-header">
        <h2>Users</h2>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            Leaderboard
          </button>
          <button
            className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
        </div>
      </div>

      {activeTab === "search" && (
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {users.length > 0 && (
            <div className="users-grid">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="user-card"
                  onClick={() => fetchUserProfile(user._id)}
                >
                  <h3>{user.username}</h3>
                  <div className="user-stats">
                    <p>
                      <strong>Solved:</strong> {user.stats?.solved || 0}
                    </p>
                    <p>
                      <strong>Accepted:</strong> {user.stats?.accepted || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && lastSearchQuery && users.length === 0 && (
            <div className="no-results">
              No users found matching "{lastSearchQuery}"
            </div>
          )}
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="leaderboard-section">
          {loading ? (
            <div className="loading">Loading leaderboard...</div>
          ) : leaderboard.length > 0 ? (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Problems Solved</th>
                  <th>Attempts</th>
                  <th>Acceptance Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user) => (
                  <tr
                    key={user._id}
                    className="leaderboard-row"
                    onClick={() => fetchUserProfile(user._id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="rank">
                      {user.rank === 1 && "🥇"}
                      {user.rank === 2 && "🥈"}
                      {user.rank === 3 && "🥉"}
                      {user.rank > 3 && user.rank}
                    </td>
                    <td className="username">{user.username}</td>
                    <td>{user.stats?.solved || 0}</td>
                    <td>{user.stats?.attempts || 0}</td>
                    <td>
                      {user.stats?.attempts > 0
                        ? (
                            ((user.stats?.accepted || 0) /
                              user.stats?.attempts) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
