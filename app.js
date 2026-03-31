require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Project Imports
const connectDB = require('./config/db');
require('./config/passport');
const { initSocket, getIO } = require('./utils/socket');

const { protect } = require('./middleware/authMiddleware'); 
const User = require('./models/User'); 

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

app.disable('x-powered-by');
connectDB();

// Security Headers (Enhanced for WebSockets)
// Security Headers (Hardened for Cloud Deployment)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        // CRITICAL: Added your render URL to connectSrc
        connectSrc: [
            "'self'", 
            "http://localhost:8080", 
            "ws://localhost:8080", 
            "https://your-app-name.onrender.com", 
            "wss://your-app-name.onrender.com", 
            "https://unpkg.com"
        ],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optimized Rate Limiting for Development
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 5000,               
    message: 'Too many requests'
});

app.use(passport.initialize());
app.use('/api', limiter); 

// --- ADMIN ROUTES ---

const ROOT_EMAIL = 'shiveksingh43@gmail.com';

// 1. Manually add a user to the whitelist (NEW LOGIC)
app.post('/api/admin/whitelist', protect, async (req, res) => {
    try {
        if (req.user.email !== ROOT_EMAIL) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });
        
        if (user) {
            user.status = 'approved';
            await user.save();
        } else {
            // Pre-create the user record so they are "approved" before they even login
            await User.create({
                email: normalizedEmail,
                name: 'Authorized Operator', // Temporary name until Google Login
                status: 'approved',
                googleId: 'pre_authorized'   // Flag to indicate pre-approval
            });
        }
        
        console.log(`[WHITELIST] Access granted for: ${normalizedEmail}`);
        res.json({ success: true, message: `Neural access granted for ${normalizedEmail}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to whitelist email' });
    }
});

// 2. Get List of all users
app.get('/api/admin/users', protect, async (req, res) => {
    try {
        if (req.user.email !== ROOT_EMAIL) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const users = await User.find({}).select('-password');
        res.json({ status: 'success', data: users });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Revoke/Purge user (Action: 'remove')
app.post('/api/admin/users/:id', protect, async (req, res) => {
    try {
        if (req.user.email !== ROOT_EMAIL) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { action } = req.body;

        if (action === 'remove') {
            const deletedUser = await User.findByIdAndDelete(req.params.id);
            if (!deletedUser) return res.status(404).json({ error: 'User not found' });
            
            console.log(`[ADMIN] User purged: ${deletedUser.email}`);
            
            // If they are currently logged in, signal their socket to boot them
            try {
                const ioInstance = getIO();
                ioInstance.to(req.params.id).emit('user_blocked');
            } catch (e) {}

            return res.json({ success: true, message: "User purged from system" });
        }

        res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error("Admin action error:", err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// --- STANDARD ROUTES ---
app.use('/api/auth', require('./routes/authroutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Verification Route
app.get('/google139dc7e565d5c808.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'google139dc7e565d5c808.html'));
});

app.use(require('./middleware/errorMiddleware'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Hardened Server running on port ${PORT}`));