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

    async def send(self, session_key: str, event_data: dict):
        # Based on the help, openclaw doesn't have an --event option for the agent command.
        # It expects a --message.
        # Since the tool wants to send event data, we should probably format the message
        # to contain the event data in a way the agent recognizes.
        # Based on your previous code for websockets:
        # if response.strip().startswith("WEB_SOCKET_SEND: "):

        message = f"WEB_SOCKET_SEND: {json.dumps(event_data)}"
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

