import { useEffect, useMemo, useState } from "react";
import "./DatingProfile.css";

const DEFAULT_PROFILE = {
  displayName: "",
  age: "",
  location: "",
  pronouns: "",
  occupation: "",
  relationshipGoal: "",
  bio: "",
  interests: "",
  dealBreakers: "",
};

export default function DatingProfile({ user }) {
  const storageKey = useMemo(() => `dating-profile-${user.id || user.username}`, [user.id, user.username]);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setProfile({ ...DEFAULT_PROFILE, displayName: user.username || "" });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setProfile({ ...DEFAULT_PROFILE, ...parsed });
    } catch (error) {
      setProfile({ ...DEFAULT_PROFILE, displayName: user.username || "" });
    }
  }, [storageKey, user.username]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(profile));
    setSavedMessage("Profile saved.");
    window.setTimeout(() => setSavedMessage(""), 2500);
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
                onChange={(e) => updateField("displayName", e.target.value)}
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
            <label htmlFor="dealBreakers">Deal Breakers / Preferences</label>
            <textarea
              id="dealBreakers"
              value={profile.dealBreakers}
              onChange={(e) => updateField("dealBreakers", e.target.value)}
              placeholder="Optional: your important boundaries or preferences"
              rows={3}
            />
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
