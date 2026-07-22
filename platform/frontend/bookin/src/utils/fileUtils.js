export const fetchFiles = async (path = ".") => {
  try {
    const response = await fetch(`/files?path=${encodeURIComponent(path)}`);
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
    const response = await fetch(`/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

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
    const response = await fetch(`/update-file`, {
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

export const fetchRunStats = async (path) => {
  try {
    const response = await fetch(`/run-stats?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Failed to fetch run stats:", error);
    return { stats: null, error: error.message };
  }
};

export const deleteItem = async (path) => {
  try {
    const response = await fetch('/delete-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path })
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.success;
  } catch (error) {
    console.error("Failed to delete item:", error);
    throw error;
  }
};

export const renameItem = async (oldPath, newName) => {
  try {
    const response = await fetch('/rename-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPath, newName })
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Failed to rename item:", error);
    throw error;
  }
};



