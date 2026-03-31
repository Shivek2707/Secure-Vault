const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'A note must have a title'],
        trim: true,
        maxlength: [100, 'Title is too long']
    },
    content: {
        type: String,
        required: [true, 'Note content cannot be empty']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Note', noteSchema);