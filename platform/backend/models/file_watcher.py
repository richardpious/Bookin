import asyncio
import os
from watchdog.events import FileSystemEventHandler

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, manager, loop):
        self.manager = manager
        self.loop = loop

    def is_simulation_complete(self, filepath):
        if not (filepath.endswith('.log') or filepath.endswith('.txt')):
            return False
        try:
            size = os.path.getsize(filepath)
            if size == 0:
                return False
            with open(filepath, 'rb') as f:
                if size > 16384:
                    f.seek(size - 16384)
                content = f.read().decode('utf-8', errors='ignore')
                return ("Overall Traffic Statistics" in content or 
                        "Time taken is" in content or
                        "plat(1)" in content)
        except Exception:
            return False

    def _notify(self, event):
        if not event.is_directory:
            is_log_file = "logs" in event.src_path or event.src_path.endswith('.log')
            
            if is_log_file:
                if self.is_simulation_complete(event.src_path):
                    asyncio.run_coroutine_threadsafe(
                        self.manager.broadcast({"type": "simulation-completed", "path": event.src_path}),
                        self.loop
                    )
            else:
                asyncio.run_coroutine_threadsafe(
                    self.manager.broadcast({"type": "file-changed", "path": event.src_path}),
                    self.loop
                )

    def on_modified(self, event):
        self._notify(event)

    def on_created(self, event):
        self._notify(event)


