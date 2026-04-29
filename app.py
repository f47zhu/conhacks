from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_EXPIRATION = 7  # days

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URI)
db = client['coding_judge']
problems_collection = db['problems']
submissions_collection = db['submissions']
users_collection = db['users']

# Authentication Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user already exists
        if users_collection.find_one({'username': username}):
            return jsonify({'error': 'Username already exists'}), 409
        
        if users_collection.find_one({'email': email}):
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user
        hashed_password = generate_password_hash(password)
        user = {
            'username': username,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.utcnow(),
            'stats': {
                'solved': 0,
                'attempts': 0,
                'accepted': 0
            }
        }
        
        result = users_collection.insert_one(user)
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'exp': datetime.utcnow() + timedelta(days=JWT_EXPIRATION)
        }, JWT_SECRET, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'username': username,
                'email': email
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Missing username or password'}), 400
        
        user = users_collection.find_one({'username': username})
        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.utcnow() + timedelta(days=JWT_EXPIRATION)
        }, JWT_SECRET, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email']
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user info"""
    try:
        return jsonify({
            'id': str(current_user['_id']),
            'username': current_user['username'],
            'email': current_user['email'],
            'stats': current_user.get('stats', {})
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API Routes
@app.route('/api/problems', methods=['GET'])
def get_problems():
    """Get all problems"""
    try:
        problems = list(problems_collection.find({}, {
            '_id': 1,
            'title': 1,
            'difficulty': 1,
            'acceptance': 1,
            'description': 1
        }))
        # Convert ObjectId to string for JSON serialization
        for problem in problems:
            problem['_id'] = str(problem['_id'])
        return jsonify(problems)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems/<problem_id>', methods=['GET'])
def get_problem(problem_id):
    """Get a specific problem"""
    try:
        problem = problems_collection.find_one({'_id': ObjectId(problem_id)})
        if not problem:
            return jsonify({'error': 'Problem not found'}), 404
        problem['_id'] = str(problem['_id'])
        return jsonify(problem)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems', methods=['POST'])
def create_problem():
    """Create a new problem (admin only)"""
    try:
        data = request.json
        result = problems_collection.insert_one(data)
        return jsonify({'_id': str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit', methods=['POST'])
@token_required
def submit_solution(current_user):
    """Submit code solution"""
    try:
        data = request.json
        problem_id = data.get('problem_id')
        code = data.get('code')
        
        # Get the problem to access test cases
        problem = problems_collection.find_one({'_id': ObjectId(problem_id)})
        if not problem:
            return jsonify({'error': 'Problem not found'}), 404
        
        # Basic validation - in production, use sandboxed execution
        test_cases = problem.get('testCases', [])
        passed = 0
        failed = 0
        results = []
        
        for test in test_cases:
            try:
                # Execute code with test input (UNSAFE - for demo only)
                # In production, use a sandboxed environment like Docker
                exec_globals = {}
                exec(code, exec_globals)
                
                # Assuming the code defines a function named 'solution'
                if 'solution' in exec_globals:
                    output = exec_globals['solution'](*test.get('input', []))
                    expected = test.get('expected')
                    if output == expected:
                        passed += 1
                        results.append({'status': 'passed', 'input': test.get('input'), 'expected': expected, 'output': output})
                    else:
                        failed += 1
                        results.append({'status': 'failed', 'input': test.get('input'), 'expected': expected, 'output': output})
            except Exception as e:
                failed += 1
                results.append({'status': 'error', 'input': test.get('input'), 'error': str(e)})
        
        submission = {
            'user_id': str(current_user['_id']),
            'problem_id': problem_id,
            'code': code,
            'passed': passed,
            'failed': failed,
            'total': len(test_cases),
            'results': results,
            'submitted_at': datetime.utcnow()
        }
        result = submissions_collection.insert_one(submission)
        
        # Update user stats if all tests passed
        if passed == len(test_cases):
            users_collection.update_one(
                {'_id': current_user['_id']},
                {
                    '$inc': {
                        'stats.accepted': 1,
                        'stats.attempts': 1,
                        'stats.solved': 1
                    }
                }
            )
        else:
            users_collection.update_one(
                {'_id': current_user['_id']},
                {'$inc': {'stats.attempts': 1}}
            )
        
        return jsonify({
            '_id': str(result.inserted_id),
            'passed': passed,
            'failed': failed,
            'total': len(test_cases),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500