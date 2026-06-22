import React from 'react';

const ApprovalModal = ({ isOpen, approvalRequest, setApprovalRequest }) => {
  if (!isOpen || !approvalRequest) return null;

  const handleDecision = async (decision) => {
    console.log(`${decision} clicked`, approvalRequest.id);
    await fetch('http://localhost:8000/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: approvalRequest.id, decision })
    });
    setApprovalRequest(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{approvalRequest.title}</h2>
        <p>{approvalRequest.description}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => handleDecision('deny')}>Deny</button>
          <button className="btn-primary" onClick={() => handleDecision('allow-once')}>Approve</button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

