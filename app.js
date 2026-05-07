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

// --- PROMETHEUS SETUP ---
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Add custom metrics if needed (Optional)
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);
// ------------------------

const app = express();
const server = http.createServer(app);

// CRITICAL for Render/Proxies
app.set('trust proxy', 1);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// 1. Initialize Socket.io with the HTTP Server
initSocket(server);

app.disable('x-powered-by');
connectDB();

// 2. Hardened Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        connectSrc: [
          "'self'", 
          "http://localhost:8080", 
          "ws://localhost:8080", 
          "https://secure-vault-p44c.onrender.com", 
          "wss://secure-vault-p44c.onrender.com",
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

// --- METRICS ENDPOINT ---
app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
});

// --- ADMIN ROUTES ---
const ROOT_EMAIL = 'shiveksingh43@gmail.com';

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
            user.role = 'user'; 
            await user.save();
            const ioInstance = getIO();
            ioInstance.to(user._id.toString()).emit('identity_approved');
        } else {
            await User.create({
                email: normalizedEmail,
                name: 'Authorized Operator',
                status: 'approved',
                role: 'user',
                googleId: 'pre_authorized' 
            });
        }
        res.json({ success: true, message: `Access granted for ${normalizedEmail}` });
    } catch (err) {
        console.error("Whitelist error:", err);
        res.status(500).json({ error: 'Failed to whitelist email' });
    }
});

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

app.post('/api/admin/users/:id', protect, async (req, res) => {
    try {
        if (req.user.email !== ROOT_EMAIL) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { action } = req.body;
        if (action === 'remove') {
            const deletedUser = await User.findByIdAndDelete(req.params.id);
            if (!deletedUser) return res.status(404).json({ error: 'User not found' });
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

app.get('/google139dc7e565d5c808.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'google139dc7e565d5c808.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Final Error Middleware
app.use(require('./middleware/errorMiddleware'));

const PORT = process.env.PORT || 8080; 

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hardened Server live on port ${PORT}`);
});