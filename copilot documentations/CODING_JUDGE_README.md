# Coding Judge

A LeetCode-style online coding judge interface built with React and Flask, with MongoDB for problem storage.

## Features

- 📝 Problem list with difficulty levels
- 💻 Code editor with syntax highlighting
- ✅ Test case execution and results display
- 🗄️ MongoDB database integration
- 🔄 Real-time submission feedback

## Project Structure

```
├── app.py                 # Flask backend
├── populate_db.py         # Script to populate sample problems
├── src/
│   ├── App.jsx           # Main React component
│   ├── index.jsx         # React entry point
│   ├── styles.css        # Global styles
│   └── components/
│       ├── ProblemsList.jsx
│       ├── ProblemsList.css
│       ├── ProblemEditor.jsx
│       └── ProblemEditor.css
├── templates/
│   └── index.html        # HTML template
├── package.json          # npm dependencies
├── vite.config.js        # Vite configuration
└── .env                  # Environment variables
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB (local or MongoDB Atlas)

### 1. Clone/Setup Project

```bash
cd conhacks
```

### 2. Set Up Python Virtual Environment

```bash
# Windows
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install flask flask-cors pymongo python-dotenv
```

### 4. Install Node Dependencies

```bash
npm install
```

### 5. Configure MongoDB

Edit `.env` file:

```env
# For local MongoDB
MONGO_URI=mongodb://localhost:27017

# For MongoDB Atlas (cloud)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

**Install MongoDB locally (optional):**
- Download from https://www.mongodb.com/try/download/community
- Run MongoDB daemon: `mongod`

**Or use MongoDB Atlas (cloud):**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get connection string

### 6. Populate Sample Data

```bash
python populate_db.py
```

This creates 5 sample problems (Easy, Medium, Hard).

### 7. Start Development Servers

**Terminal 1 - Flask Backend (port 5000):**
```bash
.venv\Scripts\Activate.ps1
flask run
```

**Terminal 2 - React Dev Server (port 5174 or 5173):**
```bash
npm run dev
```

### 8. Open in Browser

Navigate to `http://localhost:5174` (or the port shown in npm output)

## API Endpoints

### GET /api/problems
Get all problems
```json
[
  {
    "_id": "...",
    "title": "Two Sum",
    "difficulty": "Easy",
    "acceptance": "47.3%",
    "description": "..."
  }
]
```

### GET /api/problems/:problem_id
Get a specific problem with full details

### POST /api/problems
Create a new problem (admin only)

### POST /api/submit
Submit code solution
```json
{
  "problem_id": "...",
  "code": "def solution():\n    pass"
}
```

Response:
```json
{
  "passed": 2,
  "failed": 1,
  "total": 3,
  "results": [...]
}
```

## Adding New Problems

Edit `populate_db.py` and add problems to the `sample_problems` list:

```python
{
    "title": "Problem Title",
    "difficulty": "Easy|Medium|Hard",
    "acceptance": "X.X%",
    "description": "<p>HTML description</p>",
    "testCases": [
        {"input": [...], "expected": ...},
        {"input": [...], "expected": ...}
    ]
}
```

Then run:
```bash
python populate_db.py
```

## Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

## Security Notes

⚠️ **Important:** The current code execution in `/api/submit` uses `exec()` which is unsafe. For production:

1. Use a sandboxed environment like:
   - Docker containers
   - AWS Lambda
   - Judge0 API (external service)
   
2. Implement:
   - Time limits
   - Memory limits
   - Resource restrictions
   - Input validation

## Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running (local) or check connection string (Atlas)
- Verify firewall settings

**No problems displayed:**
- Run `python populate_db.py` to add sample data

**Port already in use:**
- Change port in `vite.config.js` or kill existing process

**Code execution errors:**
- Check Flask server logs for details
- Ensure test cases have correct format

## Future Enhancements

- [ ] User authentication and rankings
- [ ] Problem categories/tags
- [ ] Multiple language support
- [ ] Advanced syntax highlighting
- [ ] Discussion forum
- [ ] Solution explanations
