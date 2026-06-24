export const fetchFiles = async (path = ".") => {
  try {
    const response = await fetch(`http://localhost:8000/files?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Failed to fetch files:", error);
    throw error;
  }
};

export const readFileContent = async (path) => {
  try {
    const response = await fetch(`http://localhost:8000/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();

    // Return both the content and the resolved path if the backend provided it
    return {
      content: data.content,
      resolvedPath: data.path || path
    };
  } catch (error) {
    console.error("Failed to fetch file content:", error);
    throw error;
  }
};

export const updateFileContent = async (path, content) => {
  try {
    const response = await fetch(`http://localhost:8000/update-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, content })
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.success;
  } catch (error) {
    console.error("Failed to update file content:", error);
    throw error;
  }
};

