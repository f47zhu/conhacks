import { useEffect, useState } from "react";
import "./DatingProfile.css";

const getDefaultProfile = (username = "", age = "") => ({
  displayName: username,
  age: age,
  location: "",
  pronouns: "",
  occupation: "",
  relationshipGoal: "",
  bio: "",
  interests: "",
  dealBreakers: "",
  favouriteProblemTopics: "",
  elo: "",
  favouriteProblem: "",
  favouriteProblemId: "",
  favouriteProblemTitle: "",
  restrictMessagesToFavouriteProblemSolvers: false,
});

export default function DatingProfile({ user, onProfileUpdated }) {
  const [profile, setProfile] = useState(getDefaultProfile(user.username || "", user.age || ""));
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("/api/problems");
        const data = await response.json();
        if (!response.ok) return;
        setProblems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading problems for dropdown:", error);
      }
    };
    fetchProblems();
  }, []);

  useEffect(() => {
    // Load profile from user object (stored in MongoDB)
    if (user.profile) {
      setProfile({
        displayName: user.profile.displayName || user.username,
        age: user.age || "",
        location: user.profile.location || "",
        pronouns: user.profile.pronouns || "",
        occupation: user.profile.occupation || "",
        relationshipGoal: user.profile.relationshipGoal || "",
        bio: user.profile.bio || "",
        interests: user.profile.interests || "",
        dealBreakers: user.profile.dealBreakers || "",
        favouriteProblemTopics: user.profile.favouriteProblemTopics || "",
        elo: user.profile.elo || "",
        favouriteProblem: user.profile.favouriteProblem || "",
        favouriteProblemId: user.profile.favouriteProblemId || "",
        favouriteProblemTitle: user.profile.favouriteProblemTitle || user.profile.favouriteProblem || "",
        restrictMessagesToFavouriteProblemSolvers: !!user.profile.restrictMessagesToFavouriteProblemSolvers,
      });
    } else {
      setProfile(getDefaultProfile(user.username || "", user.age || ""));
    }
  }, [user]);

  const updateField = (field, value) => {
    if (field === "age" && value === "") {
      return;
    }
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateFavouriteProblem = (problemId) => {
    if (!problemId) {
      setProfile((current) => ({
        ...current,
        favouriteProblemId: "",
        favouriteProblemTitle: "",
        favouriteProblem: "",
      }));
      return;
    }

    const selectedProblem = problems.find((problem) => problem._id === problemId);
    const selectedTitle = selectedProblem?.title || "";
    setProfile((current) => ({
      ...current,
      favouriteProblemId: problemId,
      favouriteProblemTitle: selectedTitle,
      favouriteProblem: selectedTitle,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: {
            displayName: profile.displayName,
            location: profile.location,
            pronouns: profile.pronouns,
            occupation: profile.occupation,
            relationshipGoal: profile.relationshipGoal,
            bio: profile.bio,
            interests: profile.interests,
            dealBreakers: profile.dealBreakers,
            favouriteProblemTopics: profile.favouriteProblemTopics,
            elo: profile.elo,
            favouriteProblem: profile.favouriteProblem,
            favouriteProblemId: profile.favouriteProblemId,
            favouriteProblemTitle: profile.favouriteProblemTitle,
            restrictMessagesToFavouriteProblemSolvers: profile.restrictMessagesToFavouriteProblemSolvers,
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (onProfileUpdated && data.profile) {
          onProfileUpdated(data.profile);
        }
        setSavedMessage("Profile saved.");
        window.setTimeout(() => setSavedMessage(""), 2500);
      } else {
        setSavedMessage("Failed to save profile.");
        window.setTimeout(() => setSavedMessage(""), 2500);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSavedMessage("Error saving profile.");
      window.setTimeout(() => setSavedMessage(""), 2500);
    }
    
    setLoading(false);
  };

  return (
    <div className="dating-profile-page">
      <div className="dating-profile-card">
        <h2>Profile</h2>
        <p className="dating-profile-subtitle">Add the details you want others to know about you.</p>

        <form className="dating-profile-form" onSubmit={handleSave}>
          <div className="field-row">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={profile.displayName}
                onChange={(e) => updateField("displayName", e.target.value || user.username || "")}
                placeholder="How should people see your name?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min="18"
                value={profile.age}
                onChange={(e) => updateField("age", e.target.value)}
                placeholder="18+"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={profile.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="City, Country"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pronouns">Pronouns</label>
              <input
                id="pronouns"
                type="text"
                value={profile.pronouns}
                onChange={(e) => updateField("pronouns", e.target.value)}
                placeholder="she/her, he/him, they/them"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="form-group">
              <label htmlFor="occupation">Occupation</label>
              <input
                id="occupation"
                type="text"
                value={profile.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
                placeholder="What do you do?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="relationshipGoal">Relationship Goal</label>
              <select
                id="relationshipGoal"
                value={profile.relationshipGoal}
                onChange={(e) => updateField("relationshipGoal", e.target.value)}
              >
                <option value="Still figuring it out">Still figuring it out</option>
                <option value="New friends">New friends</option>
                <option value="Short-term dating">Short-term dating</option>
                <option value="Long-term relationship">Long-term relationship</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Write a short bio about yourself"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="interests">Interests</label>
            <textarea
              id="interests"
              value={profile.interests}
              onChange={(e) => updateField("interests", e.target.value)}
              placeholder="Examples: hiking, books, coffee, coding"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dealBreakers">Deal Breakers / Personal Preferences</label>
            <textarea
              id="dealBreakers"
              value={profile.dealBreakers}
              onChange={(e) => updateField("dealBreakers", e.target.value)}
              placeholder="Optional: your important boundaries or preferences"
              rows={3}
            />
          </div>

          <hr /> {/* Coding info (non-vibed!) */}

          <div className="field-row">
            <div className="form-group">
              <label htmlFor="favourite-problem-topics">Favourite Problem Topics</label>
              <textarea
                id="favourite-problem-topics"
                value={profile.favouriteProblemTopics}
                onChange={(e) => updateField("favouriteProblemTopics", e.target.value)}
                placeholder="Examples: strings, data structures, dynamic programming"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="elo">Elo Rating / Coding Profiles</label>
              <textarea
                id="elo"
                value={profile.elo}
                onChange={(e) => updateField("elo", e.target.value)}
                placeholder="Example: Codeforces 1500 (https://codeforces.com/profile/<username>), LeetCode 1200 (https://leetcode.com/u/<username>)"
                rows={3}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="favourite-problem">Favourite Problem</label>
            <select
              id="favourite-problem"
              value={profile.favouriteProblemId}
              onChange={(e) => updateFavouriteProblem(e.target.value)}
            >
              <option value="">Select a favourite problem</option>
              {problems.map((problemOption) => (
                <option key={problemOption._id} value={problemOption._id}>
                  {problemOption.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="restrict-messages">
              <input
                id="restrict-messages"
                type="checkbox"
                checked={profile.restrictMessagesToFavouriteProblemSolvers}
                onChange={(e) =>
                  updateField(
                    "restrictMessagesToFavouriteProblemSolvers",
                    e.target.checked
                  )
                }
              />
              {" "}Only allow messages from users who solved my favourite problem
            </label>
          </div>

          <div className="profile-actions">
            <button type="submit" className="save-profile-btn">Save Profile</button>
            {savedMessage && <span className="saved-message">{savedMessage}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
