from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URI)
db = client['coding_judge']
problems_collection = db['problems']
submissions_collection = db['submissions']

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
def submit_solution():
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
            'problem_id': problem_id,
            'code': code,
            'passed': passed,
            'failed': failed,
            'total': len(test_cases),
            'results': results
        }
        result = submissions_collection.insert_one(submission)
        
        return jsonify({
            '_id': str(result.inserted_id),
            'passed': passed,
            'failed': failed,
            'total': len(test_cases),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500