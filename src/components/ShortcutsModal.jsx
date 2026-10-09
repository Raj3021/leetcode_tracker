import React from 'react';

const SHORTCUTS = [
  ['Focus search', '/'],
  ['Next problem', 'j'],
  ['Previous problem', 'k'],
  ['Toggle solved', 'x'],
  ['Open problem', 'Enter'],
  ['Close dialog / blur search', 'Esc'],
  ['Toggle this help', '?']
];

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {SHORTCUTS.map(([desc, key]) => (
            <div className="shortcut-row" key={key}>
              <span className="shortcut-desc">{desc}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
