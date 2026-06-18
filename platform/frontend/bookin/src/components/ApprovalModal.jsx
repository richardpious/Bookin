import React from 'react';

const ApprovalModal = ({ isOpen, title, description, onApprove, onDeny }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-h)' }}>{title}</h2>
        <p style={{ marginBottom: '24px', color: 'var(--text)' }}>{description}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onDeny} 
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--text)'
            }}
          >
            Deny
          </button>
          <button 
            onClick={onApprove} 
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
