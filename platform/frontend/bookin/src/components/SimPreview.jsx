export const SimPreview = ({ data }) => {
  return (
    <div style={{ padding: '20px', color: 'var(--text-h)', overflow: 'auto', height: '100%', background: 'var(--bg)' }}>
      <h2>Simulation Preview</h2>
      <pre style={{ background: 'var(--code-bg)', padding: '15px', borderRadius: '5px', color: 'var(--text-h)' }}>
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

