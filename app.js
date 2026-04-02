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

// CRITICAL for Render/Proxies
app.set('trust proxy', 1);

// 1. Initialize Socket.io with the HTTP Server
initSocket(server);

app.disable('x-powered-by');
connectDB();

// 2. Hardened Security Headers (Fixed for Cloud WebSockets)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        // Fix: Allow Socket.io and API connections to the Render domain
        connectSrc: [
          "'self'", 
          "http://localhost:8080", 
          "ws://localhost:8080", 
          "https://secure-vault-p44c.onrender.com", 
          "wss://secure-vault-p44c.onrender.com", // Secure WebSocket for production
          "https://unpkg.com"
        ],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optimized Rate Limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 5000,               
    message: 'Too many requests'
});

app.use(passport.initialize());
app.use('/api', limiter); 

// --- ADMIN ROUTES ---
const ROOT_EMAIL = 'shiveksingh43@gmail.com';

// 1. Neural Whitelist Logic
app.post('/api/admin/whitelist', protect, async (req, res) => {
    try {
        if (req.user.email !== ROOT_EMAIL) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });
        
        if (user) {
            user.status = 'approved';
            await user.save();
        } else {
            await User.create({
                email: normalizedEmail,
                name: 'Authorized Operator',
                status: 'approved',
                role: 'user', // Ensure default role is user
                googleId: 'pre_authorized'
            });
        }
        
        console.log(`[WHITELIST] Access granted for: ${normalizedEmail}`);
        res.json({ success: true, message: `Neural access granted for ${normalizedEmail}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to whitelist email' });
    }
});

// 2. User Directory
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

// 3. User Revocation
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
            
            // Signal the user's browser to terminate immediately
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

// Static File Handling
app.get('/google139dc7e565d5c808.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'google139dc7e565d5c808.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Final Error Middleware
app.use(require('./middleware/errorMiddleware'));

// 3. Dynamic Port Logic for Cloud Deployment
const PORT = process.env.PORT || 8080; 

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hardened Server live on port ${PORT}`);
});