# User Profiles Feature

## Overview

Added a complete user profiles search and viewing system with a leaderboard. Users can now:
- Search for other users by username
- View user profiles with stats
- See a leaderboard of top users
- Track acceptance rates and submission history

## Features

✅ User Search (minimum 2 characters)
✅ User Profile Viewing
✅ Leaderboard with Rankings
✅ Statistics Display (problems solved, attempts, acceptance rate)
✅ Real-time Search Results
✅ Responsive Design

## Backend API Endpoints

### `GET /api/users/search?q={query}&limit={limit}`
Search for users by username (case-insensitive)

**Query Parameters:**
- `q` (required): Search query, minimum 2 characters
- `limit` (optional): Maximum results to return (default: 20)

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "stats": {
      "solved": 15,
      "attempts": 42,
      "accepted": 15
    },
    "created_at": "2024-04-15T10:30:00Z"
  }
]
```

**Errors:**
- 400: Query less than 2 characters

---

### `GET /api/users/{user_id}/profile`
Get detailed profile information for a specific user

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "age": 25,
  "created_at": "2024-04-15T10:30:00Z",
  "stats": {
    "solved": 15,
    "attempts": 42,
    "accepted": 15
  },
  "total_submissions": 42
}
```

**Errors:**
- 404: User not found

---

### `GET /api/users/leaderboard?limit={limit}`
Get the leaderboard of top users by problems solved

**Query Parameters:**
- `limit` (optional): Maximum users to return (default: 20)

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "top_coder",
    "rank": 1,
    "stats": {
      "solved": 150,
      "attempts": 250,
      "accepted": 150
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

## Frontend Components

### UserProfiles Component

Located: `src/components/UserProfiles.jsx`

**Features:**
- Leaderboard Tab
  - Displays top 50 users by problems solved
  - Shows rank with medals (🥇 🥈 🥉)
  - Click to view profile details

- Search Tab
  - Search for users by username
  - Displays matching users in card grid
  - Click card to view full profile

- Profile View
  - Shows user statistics
  - Acceptance rate calculation
  - Member since date
  - Back button to return to search/leaderboard

**Props:** None (uses direct API calls)

## Database Schema - Users Collection

```javascript
{
  "_id": ObjectId,
  "username": String,
  "email": String,
  "age": Number,
  "password": String,        // Hashed
  "created_at": Date,
  "stats": {
    "solved": Number,        // Problems fully solved
    "attempts": Number,      // Total submissions
    "accepted": Number       // Successful submissions
  }
}
```

## User Interface

### Navigation
Added "Users" tab in the main navigation between "Problems" and "Profile"

### Users Tab Content
Two sub-tabs:
1. **Leaderboard** - Default view showing top users ranked
2. **Search** - Find specific users by username

### Profile View
Shows comprehensive user information when clicking on a user from leaderboard or search results

## Usage

### From the UI
1. Click the "Users" tab in main navigation
2. View leaderboard or switch to search
3. In search: Enter username (min 2 chars) and click Search
4. Click any user to view their full profile
5. Click "Back" to return to the list

### API Usage (cURL)

**Search Users:**
```bash
curl -X GET "http://localhost:5000/api/users/search?q=john&limit=10"
```

**Get User Profile:**
```bash
curl -X GET "http://localhost:5000/api/users/507f1f77bcf86cd799439011/profile"
```

**Get Leaderboard:**
```bash
curl -X GET "http://localhost:5000/api/users/leaderboard?limit=50"
```

## Statistics Calculated

1. **Problems Solved** - Unique problems where all tests passed
2. **Total Attempts** - Total number of submissions made
3. **Accepted** - Submissions where all tests passed
4. **Acceptance Rate** - (Accepted / Attempts) * 100

## Files Created/Modified

### New Files
- `src/components/UserProfiles.jsx` - Main user profiles component
- `src/components/UserProfiles.css` - Styling for user profiles

### Modified Files
- `src/App.jsx` - Added UserProfiles import and Users tab navigation
- `app.py` - Added three new API endpoints

### No Changes
- `.env` - No new configuration needed
- Database schema - Uses existing users collection

## Responsive Design

The component is fully responsive:
- **Desktop:** Grid layout with proper spacing
- **Tablet:** Adjusted grid columns
- **Mobile:** Single column layout, optimized typography

## Performance Considerations

1. **Search:** Limited to 20 results by default (configurable)
2. **Leaderboard:** Sorted by `stats.solved` in MongoDB
3. **Pagination:** Not implemented yet (future enhancement)
4. **Caching:** No caching (future enhancement)

## Security Notes

✓ Public endpoints (no authentication required for viewing profiles)
✓ User passwords never exposed in responses
✓ Only safe statistics displayed
✓ No rate limiting (should add for production)

## Future Enhancements

- [ ] User follow/unfollow system
- [ ] Activity feed on user profiles
- [ ] Problem submission history
- [ ] Direct messaging between users
- [ ] User achievements/badges
- [ ] Filter leaderboard by language
- [ ] Pagination for large result sets
- [ ] User profile pictures
- [ ] User bio/description

## Troubleshooting

**No results when searching:**
- Ensure query is at least 2 characters
- Check if username exists
- Try different search terms

**Profile not loading:**
- Ensure user_id is valid ObjectId
- Check MongoDB connection
- Look for errors in browser console

**Leaderboard empty:**
- Check if any users have solved problems
- Verify stats are being updated on submissions
- Check MongoDB users collection

## Testing

Test users should be created with submissions to populate leaderboard:
1. Register multiple users
2. Have each user solve problems
3. View leaderboard - should show ranked users
4. Search for users - should find by username
5. Click users - should show profiles with correct stats
