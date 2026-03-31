const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: [true, 'File name is required']
    },
    fileData: {
        type: Buffer, // Stores the encrypted binary data
        required: true
    },
    iv: {
        type: String, // Hex string of the Initialization Vector
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster retrieval of a user's files
fileSchema.index({ user: 1 });

module.exports = mongoose.model('File', fileSchema);