const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const File = require('../models/File');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Helper: Ensure your secret is exactly 32 bytes for aes-256
const getSecret = () => crypto.createHash('sha256').update(process.env.JWT_ACCESS_SECRET).digest();

router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        const iv = crypto.randomBytes(16); // Generate a random IV for every file
        const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), iv);
        
        const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

        await File.create({
            fileName: req.file.originalname,
            fileData: encrypted,
            iv: iv.toString('hex'), // Store the IV so we can decrypt later
            user: req.user.id,
            fileType: req.file.mimetype
        });

        res.json({ status: 'success', message: 'File encrypted and vaulted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Encryption failed' });
    }
});

router.get('/download/:id', protect, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file || file.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access Denied" });
        }

        const iv = Buffer.from(file.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), iv);
        
        const decrypted = Buffer.concat([decipher.update(file.fileData), decipher.final()]);

        res.set('Content-Type', file.fileType);
        res.set('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.send(decrypted);
    } catch (err) {
        res.status(500).json({ message: "Decryption failed" });
    }
});

// GET all files for the logged-in user
router.get('/', protect, async (req, res) => {
    const files = await File.find({ user: req.user.id }).select('-fileData -iv');
    res.json({ status: 'success', data: files });
});

module.exports = router;