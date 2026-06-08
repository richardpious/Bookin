import asyncio
import json

class OpenClawAgentBridge:
    async def send_message(
        self,
        message: str,
        session_key: str,
    ) -> str:

        proc = await asyncio.create_subprocess_exec(
            "openclaw",
            "agent",
            "--agent",
            "main",
            "--session-key",
            session_key,
            "--message",
            message,
            "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise Exception(stderr.decode())

        result = json.loads(stdout.decode())

        return result["result"]["payloads"][0]["text"]
