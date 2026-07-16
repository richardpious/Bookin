import os
from chat_history import ChatHistoryDB
import bcrypt
import traceback

def main():
    try:
        db = ChatHistoryDB("chat_history.db")
        print("DB initialized")
        
        # Simulating adding a user
        username = "new_test_user_123"
        password = "testpassword"
        
        user_id = db.add_user(username, password)
        print(f"User added with ID: {user_id}")
        
    except Exception as e:
        print("Error during add_user:")
        traceback.print_exc()

if __name__ == "__main__":
    main()
