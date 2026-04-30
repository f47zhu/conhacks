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
messages_collection = db['messages']

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
        age = data.get('age')
        password = data.get('password')
        
        # Validation
        if not username or not email or age is None or not password:
            return jsonify({'error': 'Missing required fields'}), 400

        try:
            age = int(age)
        except (TypeError, ValueError):
            return jsonify({'error': 'Age must be a valid number'}), 400

        if age < 18:
            return jsonify({'error': 'Age must be at least 18'}), 400
        
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
            'age': age,
            'password': hashed_password,
            'created_at': datetime.utcnow(),
            'stats': {
                'solved': 0,
                'attempts': 0,
                'accepted': 0
            },
            'profile': {
                'displayName': username,
                'location': '',
                'pronouns': '',
                'occupation': '',
                'relationshipGoal': '',
                'bio': '',
                'interests': '',
                'dealBreakers': '',
                'favouriteProblemTopics': '',
                'elo': '',
                'favouriteProblem': '',
                'favouriteProblemId': '',
                'favouriteProblemTitle': '',
                'restrictMessagesToFavouriteProblemSolvers': False
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
                'email': email,
                'age': age,
                'profile': user.get('profile', {})
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
                'email': user['email'],
                'age': user.get('age'),
                'profile': user.get('profile', {})
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
            'age': current_user.get('age'),
            'stats': current_user.get('stats', {}),
            'profile': current_user.get('profile', {})
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile"""
    try:
        data = request.json
        profile_data = data.get('profile', {})
        
        # Update only allowed fields
        allowed_fields = ['displayName', 'location', 'pronouns', 'occupation',
                         'relationshipGoal', 'bio', 'interests', 'dealBreakers',
                         'favouriteProblemTopics', 'elo', 'favouriteProblem',
                         'favouriteProblemId', 'favouriteProblemTitle',
                         'restrictMessagesToFavouriteProblemSolvers']
        
        updated_profile = current_user.get('profile', {})
        for field in allowed_fields:
            if field in profile_data:
                updated_profile[field] = profile_data[field]
        
        users_collection.update_one(
            {'_id': current_user['_id']},
            {'$set': {'profile': updated_profile}}
        )
        
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': updated_profile
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
            'results': results,
            'code': code,
            'submitted_at': submission['submitted_at'].isoformat() + 'Z'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/submissions', methods=['GET'])
@token_required
def get_submissions(current_user):
    """Get current user's previous submissions, optionally filtered by problem_id"""
    try:
        problem_id = request.args.get('problem_id')

        query = {'user_id': str(current_user['_id'])}
        if problem_id:
            query['problem_id'] = problem_id

        submissions = list(submissions_collection.find(
            query,
            {
                '_id': 1,
                'problem_id': 1,
                'code': 1,
                'passed': 1,
                'failed': 1,
                'total': 1,
                'results': 1,
                'submitted_at': 1
            }
        ).sort('submitted_at', -1))

        for submission in submissions:
            submission['_id'] = str(submission['_id'])
            submitted_at = submission.get('submitted_at')
            if isinstance(submitted_at, datetime):
                submission['submitted_at'] = submitted_at.isoformat() + 'Z'

        return jsonify(submissions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Get current user's chat conversations with last message preview"""
    try:
        user_id = str(current_user['_id'])
        pipeline = [
            {
                '$match': {
                    '$or': [{'sender_id': user_id}, {'receiver_id': user_id}]
                }
            },
            {'$sort': {'created_at': -1}},
            {
                '$project': {
                    'sender_id': 1,
                    'receiver_id': 1,
                    'content': 1,
                    'created_at': 1,
                    'other_user_id': {
                        '$cond': [{'$eq': ['$sender_id', user_id]}, '$receiver_id', '$sender_id']
                    }
                }
            },
            {
                '$group': {
                    '_id': '$other_user_id',
                    'last_message': {'$first': '$content'},
                    'created_at': {'$first': '$created_at'}
                }
            },
            {'$sort': {'created_at': -1}}
        ]

        conversations = list(messages_collection.aggregate(pipeline))
        user_ids = []
        for conversation in conversations:
            user_ids.append(ObjectId(conversation['_id']))

        users = {}
        if user_ids:
            for user in users_collection.find({'_id': {'$in': user_ids}}, {'username': 1}):
                users[str(user['_id'])] = user.get('username', 'Unknown')

        result = []
        for conversation in conversations:
            other_user_id = conversation['_id']
            result.append({
                'user_id': other_user_id,
                'username': users.get(other_user_id, 'Unknown'),
                'last_message': conversation.get('last_message', ''),
                'created_at': conversation.get('created_at').isoformat() + 'Z' if conversation.get('created_at') else None
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/messages/<other_user_id>', methods=['GET'])
@token_required
def get_chat_messages(current_user, other_user_id):
    """Get message history between current user and another user"""
    try:
        current_user_id = str(current_user['_id'])
        other_user = users_collection.find_one({'_id': ObjectId(other_user_id)}, {'username': 1})
        if not other_user:
            return jsonify({'error': 'User not found'}), 404

        messages = list(messages_collection.find(
            {
                '$or': [
                    {'sender_id': current_user_id, 'receiver_id': other_user_id},
                    {'sender_id': other_user_id, 'receiver_id': current_user_id}
                ]
            },
            {
                '_id': 1,
                'sender_id': 1,
                'receiver_id': 1,
                'content': 1,
                'created_at': 1
            }
        ).sort('created_at', 1))

        for message in messages:
            message['_id'] = str(message['_id'])
            message['created_at'] = message['created_at'].isoformat() + 'Z'

        return jsonify({
            'other_user': {
                'id': other_user_id,
                'username': other_user.get('username')
            },
            'messages': messages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/messages', methods=['POST'])
@token_required
def send_chat_message(current_user):
    """Send a chat message to another user"""
    try:
        data = request.json
        receiver_id = data.get('receiver_id')
        content = (data.get('content') or '').strip()

        if not receiver_id or not content:
            return jsonify({'error': 'receiver_id and content are required'}), 400

        if receiver_id == str(current_user['_id']):
            return jsonify({'error': 'Cannot message yourself'}), 400

        receiver_user = users_collection.find_one({'_id': ObjectId(receiver_id)}, {'_id': 1, 'profile': 1})
        if not receiver_user:
            return jsonify({'error': 'Receiver not found'}), 404

        if len(content) > 2000:
            return jsonify({'error': 'Message too long (max 2000 characters)'}), 400

        receiver_profile = receiver_user.get('profile', {}) if receiver_user else {}
        restrict_messages = receiver_profile.get('restrictMessagesToFavouriteProblemSolvers', False)
        favourite_problem_id = receiver_profile.get('favouriteProblemId')
        favourite_problem_title = receiver_profile.get('favouriteProblemTitle') or receiver_profile.get('favouriteProblem') or 'their favourite problem'

        if restrict_messages and favourite_problem_id:
            solved_count = submissions_collection.count_documents({
                'user_id': str(current_user['_id']),
                'problem_id': favourite_problem_id,
                'total': {'$gt': 0},
                '$expr': {'$eq': ['$passed', '$total']}
            })
            if solved_count == 0:
                return jsonify({
                    'error': f"You must solve {favourite_problem_title} before messaging this user."
                }), 403

        message = {
            'sender_id': str(current_user['_id']),
            'receiver_id': receiver_id,
            'content': content,
            'created_at': datetime.utcnow()
        }
        result = messages_collection.insert_one(message)

        return jsonify({
            '_id': str(result.inserted_id),
            'sender_id': message['sender_id'],
            'receiver_id': message['receiver_id'],
            'content': message['content'],
            'created_at': message['created_at'].isoformat() + 'Z'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User Profile Routes
@app.route('/api/users/search', methods=['GET'])
def search_users():
    """Search for users by username"""
    try:
        query = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 20))
        
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search for users matching the query
        users = list(users_collection.find(
            {'username': {'$regex': query, '$options': 'i'}},
            {
                '_id': 1,
                'username': 1,
                'stats': 1,
                'created_at': 1
            }
        ).limit(limit))
        
        # Convert ObjectIds to strings
        for user in users:
            user['_id'] = str(user['_id'])
        
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    """Get a user's profile information"""
    try:
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user submission statistics
        submissions = list(submissions_collection.find(
            {'user_id': user_id},
            {'results': 1, 'submitted_at': 1}
        ))
        
        # Calculate stats
        total_submissions = len(submissions)
        unique_problems_solved = len(set(s['problem_id'] for s in submissions_collection.find(
            {'user_id': user_id, 'passed': {'$eq': submissions_collection.count_documents({})}}
        )))
        
        profile = {
            'id': str(user['_id']),
            'username': user['username'],
            'created_at': user.get('created_at'),
            'stats': user.get('stats', {'solved': 0, 'attempts': 0, 'accepted': 0}),
            'total_submissions': total_submissions,
            'age': user.get('age', None),
            'profile': user.get('profile', {})
        }
        
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get leaderboard of top users by problems solved"""
    try:
        limit = int(request.args.get('limit', 20))
        
        users = list(users_collection.find(
            {},
            {
                '_id': 1,
                'username': 1,
                'stats': 1,
                'created_at': 1
            }
        ).sort('stats.solved', -1).limit(limit))
        
        # Convert ObjectIds to strings and add rank
        leaderboard = []
        for i, user in enumerate(users, 1):
            user['_id'] = str(user['_id'])
            user['rank'] = i
            leaderboard.append(user)
        
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
