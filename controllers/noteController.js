const Note = require('../models/Note');
const logger = require('../utils/logger');

exports.createNote = async (req, res) => {
    try {
        const newNote = await Note.create({
            title: req.body.title,
            content: req.body.content,
            user: req.user.id // Taken from the 'protect' middleware
        });
        res.status(201).json({ status: 'success', data: newNote });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.getMyNotes = async (req, res) => {
    // SECURITY: Only find notes belonging to THIS user
    const notes = await Note.find({ user: req.user.id });
    res.status(200).json({ status: 'success', results: notes.length, data: notes });
};

exports.deleteNote = async (req, res) => {
    const note = await Note.findById(req.params.id);

    if (!note) return res.status(404).json({ message: 'Note not found' });

    // BOLA CHECK: Is this your note?
    if (note.user.toString() !== req.user.id) {
        logger.warn(`Unauthorized delete attempt by user ${req.user.id} on note ${req.params.id}`);
        return res.status(403).json({ message: 'You do not own this note!' });
    }

    await note.deleteOne();
    res.status(204).json({ status: 'success', data: null });
};