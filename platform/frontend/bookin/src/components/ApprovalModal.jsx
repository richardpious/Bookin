import React from 'react';
import './ApprovalModal.css';

const ApprovalModal = ({ isOpen, title, description, onApprove, onDeny }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button onClick={onApprove} className="btn-approve">Approve</button>
          <button onClick={onDeny} className="btn-deny">Deny</button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
