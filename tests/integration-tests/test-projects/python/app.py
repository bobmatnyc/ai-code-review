from flask import Flask, jsonify, request
import os
from models.user import User, users, find_user_by_id, create_user

app = Flask(__name__)

# Deliberately use global variable (not best practice) for test
debug_mode = True

@app.route('/api/users', methods=['GET'])
def get_users():
    # Security issue: returning passwords
    return jsonify(users)

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = find_user_by_id(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    # Security issue: returning password
    return jsonify(user)

@app.route('/api/users', methods=['POST'])
def add_user():
    try:
        data = request.get_json()

        # Missing validation

        # Performance issue: using globals directly
        new_id = len(users) + 1

        new_user = {
            "id": new_id,
            "name": data.get("name"),
            "email": data.get("email"),
            "password": data.get("password"),  # Security issue: password not hashed
            "created_at": "2023-04-15T10:00:00Z"
        }

        user = create_user(new_user)
        return jsonify(user), 201
    except Exception as e:
        # Bad error handling (too broad)
        return jsonify({"message": "Error creating user"}), 500

# Bug: route with incorrect error handling
@app.route('/api/status')
def get_status():
    return jsonify({"status": "ok"})
    return "API is running"  # Unreachable code

# Unused function (for testing unused code detection)
def calculate_something(x, y):
    return x * y

if __name__ == '__main__':
    app.run(debug=True, port=5000)
