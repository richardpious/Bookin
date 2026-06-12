export const SimPreview = ({ data }) => {
  let parsedData;
  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    parsedData = { error: "Invalid JSON", raw: data };
  }

  return (
    <div style={{ padding: '20px', color: 'var(--text-h)', overflow: 'auto', height: '100%', background: 'var(--bg)' }}>
      <h2>Simulation Preview</h2>
      <div style={{ background: 'var(--code-bg)', padding: '15px', borderRadius: '5px', color: 'var(--text-h)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {Object.entries(parsedData).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '8px' }}>
            <strong style={{ color: 'var(--accent-color)' }}>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </div>
        ))}
      </div>
    </div>
  );
};

