# Authentication Implementation - Coding Judge

## Overview

User authentication has been added to the coding judge platform using:
- **Backend**: Flask with JWT (JSON Web Tokens)
- **Database**: MongoDB (users collection)
- **Frontend**: React with localStorage for token management
- **Password Security**: Werkzeug for password hashing (bcrypt-style)

## Features

✅ User Registration
✅ User Login/Logout
✅ JWT Token-based Authentication
✅ Protected Routes (problems require login)
✅ User Statistics Tracking (solved, attempts, accepted)
✅ Session Persistence (token stored in localStorage)

## Database Schema

### Users Collection

```javascript
{
  "_id": ObjectId,
  "username": String,      // Unique
  "email": String,         // Unique
  "password": String,      // Hashed with werkzeug.security
  "created_at": Date,
  "stats": {
    "solved": Number,      // Total problems solved
    "attempts": Number,    // Total submission attempts
    "accepted": Number     // Successful submissions
  }
}
```

### Submissions Collection (Updated)

```javascript
{
  "_id": ObjectId,
  "user_id": String,       // User who submitted
  "problem_id": String,    // Problem attempted
  "code": String,          // Submitted code
  "passed": Number,        // Test cases passed
  "failed": Number,        // Test cases failed
  "total": Number,         // Total test cases
  "results": Array,        // Detailed test results
  "submitted_at": Date
}
```

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** (201 Created)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
- 400: Missing required fields
- 409: Username or email already exists
- 400: Password less than 6 characters

---

#### `POST /api/auth/login`
Login user

**Request:**
```json
{
  "username": "john_doe",
  "password": "securepassword123"
}
```

**Response:** (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
- 400: Missing username or password
- 401: Invalid username or password

---

#### `GET /api/auth/me`
Get current user information (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "email": "john@example.com",
  "stats": {
    "solved": 5,
    "attempts": 12,
    "accepted": 5
  }
}
```

**Errors:**
- 401: Token missing
- 401: Token invalid or expired

---

### Protected Endpoints

#### `POST /api/submit`
Submit code solution (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "problem_id": "507f1f77bcf86cd799439011",
  "code": "def solution(nums, target):\n    return [0, 1]"
}
```

**Response:** (200 OK)
```json
{
  "_id": "...",
  "passed": 3,
  "failed": 0,
  "total": 3,
  "results": [
    {
      "status": "passed",
      "input": [...],
      "expected": [...],
      "output": [...]
    }
  ]
}
```

**User Stats Updated:**
- If all tests pass: `stats.accepted++`, `stats.solved++`, `stats.attempts++`
- If some tests fail: `stats.attempts++`

---

## Frontend Flow

### 1. Startup
- App checks for token in localStorage
- If token exists, validates it via `/api/auth/me`
- If valid, loads problems list
- If invalid, redirects to login

### 2. Registration
```
User enters credentials → POST /api/auth/register → Token saved → Problems list
```

### 3. Login
```
User enters credentials → POST /api/auth/login → Token saved → Problems list
```

### 4. Protected Operations
```
Submit code → Include Authorization header with token → API validates → Execute
```

### 5. Logout
```
User clicks logout → Clear localStorage token → Redirect to login page
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **JWT Secret**: Change `JWT_SECRET` in `.env` for production. Use strong, random string.

2. **HTTPS**: Always use HTTPS in production to prevent token interception.

3. **Token Expiration**: Currently set to 7 days. Adjust in `app.py`:
   ```python
   JWT_EXPIRATION = 7  # days
   ```

4. **Password Hashing**: Uses werkzeug which provides PBKDF2-SHA256 hashing. In production, consider bcrypt:
   ```bash
   pip install bcrypt
   ```

5. **CORS**: Currently allows all origins. Restrict in production:
   ```python
   CORS(app, origins=["https://yourdomain.com"])
   ```

6. **Rate Limiting**: No rate limiting implemented. Add for production:
   ```bash
   pip install flask-limiter
   ```

## Running the Application

### Start Flask (with auth support)
```bash
.venv\Scripts\Activate.ps1
flask run
```

### Start React Dev Server
```bash
npm run dev
```

### Access
```
http://localhost:5174 (or shown port)
```

## Testing Authentication

### Register Test User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Login Test User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Files Modified/Created

### Backend
- `app.py` - Added authentication routes and decorators
- `.env` - Added JWT_SECRET

### Frontend
- `src/App.jsx` - Added auth state management
- `src/components/Login.jsx` - Login form (NEW)
- `src/components/Register.jsx` - Register form (NEW)
- `src/components/Auth.css` - Auth styling (NEW)
- `src/components/ProblemEditor.jsx` - Updated to include auth token
- `src/App.css` - Updated header styling

### Configuration
- `.env.example` - Updated with JWT_SECRET example

## Troubleshooting

**"Token is missing" error:**
- Ensure token is stored in localStorage
- Check browser DevTools → Application → Local Storage

**"Invalid token" error:**
- Token may have expired (7 days)
- Need to re-login
- Check browser console for token value

**"User not found" error:**
- Token is valid but user was deleted from DB
- Re-login to get new token

**CORS errors:**
- Ensure Flask CORS is enabled (should be in app.py)
- Check that origin is allowed

## Next Steps

1. **Email Verification**: Add email confirmation on registration
2. **Password Reset**: Implement forgot password flow
3. **OAuth Integration**: Add GitHub/Google login
4. **2FA**: Add two-factor authentication
5. **User Profiles**: Display user stats and solutions history
6. **Admin Panel**: Manage problems and users
7. **Leaderboard**: Rank users by problems solved
8. **Social Features**: Follow users, comments on problems
