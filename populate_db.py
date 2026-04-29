"""
Script to populate MongoDB with sample coding problems
Run this once to set up sample data
"""
from pymongo import MongoClient
import os

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URI)
db = client['coding_judge']
problems_collection = db['problems']

# Clear existing problems
problems_collection.delete_many({})

sample_problems = [
    {
        "title": "Two Sum",
        "difficulty": "Easy",
        "acceptance": "47.3%",
        "description": "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return the indices of the two numbers that add up to the target.</p><p>You may assume each input has exactly one solution, and you cannot use the same element twice.</p><p><strong>Example:</strong></p><pre>Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9, so we return [0, 1].</pre>",
        "testCases": [
            {"input": [[2, 7, 11, 15], 9], "expected": [0, 1]},
            {"input": [[3, 2, 4], 6], "expected": [1, 2]},
            {"input": [[3, 3], 6], "expected": [0, 1]},
        ]
    },
    {
        "title": "Reverse String",
        "difficulty": "Easy",
        "acceptance": "78.9%",
        "description": "<p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p><p>You must do this by modifying the input array in-place with <code>O(1)</code> extra memory.</p><p><strong>Example:</strong></p><pre>Input: s = ['h','e','l','l','o']\nOutput: ['o','l','l','e','h']</pre>",
        "testCases": [
            {"input": [['h', 'e', 'l', 'l', 'o']], "expected": ['o', 'l', 'l', 'e', 'h']},
            {"input": [['H', 'a', 'n', 'n', 'a', 'h']], "expected": ['h', 'a', 'n', 'n', 'a', 'H']},
        ]
    },
    {
        "title": "Palindrome Number",
        "difficulty": "Easy",
        "acceptance": "52.2%",
        "description": "<p>Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is palindrome integer.</p><p>An integer is a palindrome when it reads the same backward as forward. For example, 121 is a palindrome while 123 is not.</p><p><strong>Example:</strong></p><pre>Input: x = 121\nOutput: True\n\nInput: x = -121\nOutput: False</pre>",
        "testCases": [
            {"input": [121], "expected": True},
            {"input": [-121], "expected": False},
            {"input": [10], "expected": False},
            {"input": [0], "expected": True},
        ]
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "acceptance": "33.8%",
        "description": "<p>Given a string <code>s</code>, find the length of the longest substring without repeating characters.</p><p><strong>Example:</strong></p><pre>Input: s = 'abcabcbb'\nOutput: 3\nExplanation: The answer is 'abc', with the length of 3.\n\nInput: s = 'bbbbb'\nOutput: 1\nExplanation: The answer is 'b', with the length of 1.</pre>",
        "testCases": [
            {"input": ['abcabcbb'], "expected": 3},
            {"input": ['bbbbb'], "expected": 1},
            {"input": ['pwwkew'], "expected": 3},
            {"input": [''], "expected": 0},
        ]
    },
    {
        "title": "Median of Two Sorted Arrays",
        "difficulty": "Hard",
        "acceptance": "27.5%",
        "description": "<p>Given two sorted arrays <code>nums1</code> and <code>nums2</code> of size <code>m</code> and <code>n</code> respectively, return the median of the two sorted arrays.</p><p>The overall run time complexity should be <code>O(log(m+n))</code>.</p><p><strong>Example:</strong></p><pre>Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.0\n\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.5</pre>",
        "testCases": [
            {"input": [[1, 3], [2]], "expected": 2.0},
            {"input": [[1, 2], [3, 4]], "expected": 2.5},
        ]
    },
]

result = problems_collection.insert_many(sample_problems)
print(f"Inserted {len(result.inserted_ids)} problems into the database!")
print("Sample problems:")
for i, problem in enumerate(sample_problems, 1):
    print(f"{i}. {problem['title']} ({problem['difficulty']})")
