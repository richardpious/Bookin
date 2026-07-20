import { useCallback } from 'react';

export function useAgentSettings(token, username, sessionId) {
  const handleModelChange = useCallback(async (modelId) => {
    console.log("Model changed to:", modelId);
    try {
      const response = await fetch('/set-model', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          model: modelId
        })
      });
      const data = await response.json();
      console.log("Model switch response:", data);
      return data;
    } catch (err) {
      console.error("Error setting model:", err);
      throw err;
    }
  }, [sessionId, token]);

  const handleThinkingLevelChange = useCallback(async (level) => {
    console.log("Thinking level changed to:", level);
    try {
      const response = await fetch('/set-thinking-level', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: `agent:main:${username}:${sessionId}`,
          agentId: "main",
          thinkingLevel: level
        })
      });
      const data = await response.json();
      console.log("Thinking level switch response:", data);
      return data;
    } catch (err) {
      console.error("Error setting thinking level:", err);
      throw err;
    }
  }, [sessionId, username, token]);

  return {
    handleModelChange,
    handleThinkingLevelChange
  };
}
