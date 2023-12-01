import React, { useState } from 'react';

interface TextBoxDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
}

const DialogBox: React.FC<TextBoxDialogProps> = ({ open, onClose, onConfirm }) => {
    const [inputValue, setInputValue] = useState('');

    const handleClose = () => {
        setInputValue('');
        onClose();
    };

    const handleConfirm = () => {
        onConfirm(inputValue);
        setInputValue('');
        onClose();
    };

    return (
        <div style={{ display: open ? 'block' : 'none' }}>
            <div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            </div>
            <button onClick={handleClose}>Cancel</button>
            <button onClick={handleConfirm}>Confirm</button>
        </div>
    );
};

export default DialogBox;