import asyncio
from watchdog.events import FileSystemEventHandler

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, manager, loop):
        self.manager = manager
        self.loop = loop

    def on_modified(self, event):
        if not event.is_directory:
            # Schedule the coroutine on the main loop
            asyncio.run_coroutine_threadsafe(
                self.manager.broadcast({"type": "file-changed", "path": event.src_path}),
                self.loop
            )
