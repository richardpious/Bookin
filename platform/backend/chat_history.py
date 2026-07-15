import sqlite3
import os
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
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()

    def add_message(self, session_id, sender, message):
        if not message:
            message = ""
        conn = sqlite3.connect(self.db_path, timeout=10)
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT sender, message FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 1',
            (session_id,)
        )
        last = cursor.fetchone()
        if last and last[0] == sender and last[1] == message:
            conn.close()
            return

        cursor.execute(
            'INSERT INTO messages (session_id, sender, message) VALUES (?, ?, ?)',
            (session_id, sender, message)
        )
        conn.commit()
        conn.close()

    def get_history(self, session_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        cursor = conn.cursor()
        cursor.execute(
            'SELECT sender, message, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
            (session_id,)
        )
        messages = cursor.fetchall()
        conn.close()
        return [{"sender": m[0], "message": m[1], "timestamp": m[2]} for m in messages]

    def get_all_sessions(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT session_id FROM messages')
        sessions = [r[0] for r in cursor.fetchall()]
        conn.close()
        return sessions

    def reset_session(self, session_id):
        # For now, reset just clears messages too, as per previous implementation
        self.delete_session(session_id)
    def delete_session(self, session_id):
        conn = sqlite3.connect(self.db_path, timeout=10)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
        conn.commit()
        conn.close()

