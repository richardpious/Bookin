import sqlite3
import os
import bcrypt
from datetime import datetime

class ChatHistoryDB:
    def __init__(self, db_path="chat_history.db"):
        # Get the directory where this script is located
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(base_dir, db_path)
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        # Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        ''')
        conn.commit()
        conn.close()

    def add_user(self, username, password):
        # Hash the password
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        conn = sqlite3.connect(self.db_path, timeout=10)
        cursor = conn.cursor()
        try:
            cursor.execute(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                (username, hashed)
            )
            user_id = cursor.lastrowid
            conn.commit()
            return user_id
        except sqlite3.IntegrityError:
            return None # Username already exists
        finally:
            conn.close()

    def get_user_by_username(self, username):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT id, username, password_hash FROM users WHERE username = ?',
                (username,)
            )
            user = cursor.fetchone()
            
            if user:
                return {"id": user[0], "username": user[1], "password_hash": user[2]}
            return None
        finally:
            conn.close()

    def verify_user(self, username, password):
        user = self.get_user_by_username(username)
        if not user:
            return None
            
        if bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            return user
        return None

    def create_session(self, session_id, user_id, title=None):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)',
                (session_id, user_id, title)
            )
            conn.commit()
        finally:
            conn.close()

    def get_user_sessions(self, user_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, title, created_at, updated_at 
                FROM sessions 
                WHERE user_id = ? 
                ORDER BY updated_at DESC
            ''', (user_id,))
            sessions = cursor.fetchall()
            
            return [{"id": s[0], "title": s[1], "created_at": s[2], "updated_at": s[3]} for s in sessions]
        finally:
            conn.close()

    def add_message(self, session_id, sender, message):
        if not message:
            message = ""
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            conn.execute("PRAGMA foreign_keys = ON;")
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT sender, message FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 1',
                (session_id,)
            )
            last = cursor.fetchone()
            if last and last[0] == sender and last[1] == message:
                return

            cursor.execute(
                'INSERT INTO messages (session_id, sender, message) VALUES (?, ?, ?)',
                (session_id, sender, message)
            )
            cursor.execute(
                'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (session_id,)
            )
            conn.commit()
        finally:
            conn.close()

    def get_history(self, session_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT sender, message, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
                (session_id,)
            )
            messages = cursor.fetchall()
            return [{"sender": m[0], "message": m[1], "timestamp": m[2]} for m in messages]
        finally:
            conn.close()

    def get_all_sessions(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id 
                FROM sessions 
                ORDER BY updated_at DESC
            ''')
            sessions = [r[0] for r in cursor.fetchall()]
            return sessions
        finally:
            conn.close()

    def reset_session(self, session_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
            conn.commit()
        finally:
            conn.close()

    def delete_session(self, session_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        try:
            conn.execute("PRAGMA foreign_keys = ON;")
            cursor = conn.cursor()
            cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            conn.commit()
        finally:
            conn.close()
