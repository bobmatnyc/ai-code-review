# Deliberately contains some best practice issues for testing

# Global array (not best practice)
users = [
    {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "password": "password123",  # Security issue: hardcoded password
        "created_at": "2023-04-15T10:00:00Z"
    }
]

class User:
    def __init__(self, id, name, email, password, created_at):
        self.id = id
        self.name = name
        self.email = email
        self.password = password  # Security issue: storing password unencrypted
        self.created_at = created_at

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "password": self.password,  # Security issue: returning password
            "created_at": self.created_at
        }

def find_user_by_id(id):
    # Performance issue: using a loop instead of a more efficient lookup
    for user in users:
        if user["id"] == id:
            return user
    return None

def create_user(user):
    # Missing validation

    # Security issue: No password hashing
    users.append(user)
    return user

# Unused function (for testing unused code detection)
def validate_email(email):
    import re
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))
