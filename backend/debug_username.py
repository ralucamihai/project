import requests


def test_debug_user(username):
    """Test the debug endpoint to check if user exists"""
    url = f"http://127.0.0.1:8000/debug/user/{username}"
    
    try:
        response = requests.get(url)
        print(f"Debug Status Code: {response.status_code}")
        print(f"Debug Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Debug Error: {e}")
        return None

print(test_debug_user("georgei"))

def test_get_all_users():
    """Get all users to see what's in the database"""
    url = "http://127.0.0.1:8000/api/users"  # You might need to create this endpoint
    
    try:
        response = requests.get(url)
        print(f"All Users Status Code: {response.status_code}")
        print(f"All Users Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Get All Users Error: {e}")
        return None

# Test what users exist
print("=== Checking all users in database ===")
all_users = test_get_all_users()