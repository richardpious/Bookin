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
