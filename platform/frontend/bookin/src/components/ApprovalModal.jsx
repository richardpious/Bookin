import React from 'react';

const ApprovalModal = ({ isOpen, title, description, onApprove, onDeny }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onDeny}>Deny</button>
          <button className="btn-primary" onClick={onApprove}>Approve</button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

