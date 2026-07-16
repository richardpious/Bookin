from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)

    def disconnect(self, client_id: str, websocket: WebSocket = None):
        if client_id in self.active_connections:
            if websocket:
                if websocket in self.active_connections[client_id]:
                    self.active_connections[client_id].remove(websocket)
                if not self.active_connections[client_id]:
                    del self.active_connections[client_id]
            else:
                del self.active_connections[client_id]

    async def broadcast(self, message: dict):
        for connections in self.active_connections.values():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.active_connections[client_id]:
                    self.active_connections[client_id].remove(dead)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]

