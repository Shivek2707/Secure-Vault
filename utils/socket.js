const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io; // Hold the instance globally in this file

const initSocket = (server) => {
    io = new Server(server, {
        cors: { 
            origin: "https://secure-vault-p44c.onrender.com",
            methods: ["GET", "POST"],
            credentials: true
        },
        // CHANGE: Allow polling to establish the link, then upgrade to websocket
        transports: ["polling", "websocket"], 
        allowEIO3: true // Backwards compatibility for older handshakes
    });
    // ... rest of your code

    // Middleware: Auth check
    io.use((socket, next) => {
        // Check for token in auth object (Frontend must send: { auth: { token: '...' } })
        const token = socket.handshake.auth.token;
        
        if (!token) {
            console.log("[SOCKET] Connection blocked: No token provided");
            return next(new Error("Authentication error"));
        }

        jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
            if (err) {
                console.log("[SOCKET] Connection blocked: Invalid JWT");
                return next(new Error("Invalid token"));
            }
            socket.user = decoded; 
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`⚡ Neural Link Established: ${socket.user.id} (${socket.user.email})`);

        // Join a private room based on User ID for targeted signals (like approval)
        socket.join(socket.user.id);

        // --- Chat Logic ---
        socket.on('send_message', (data) => {
            // Hardened: Strip HTML tags to prevent XSS in chat
            const cleanMessage = data.message.replace(/<[^>]*>?/gm, ''); 
            io.emit('receive_message', {
                message: cleanMessage, 
                senderName: data.senderName,
                senderEmail: data.senderEmail,
                time: new Date().toLocaleTimeString()
            });
        });

        // --- Whitelist/Status Probe Logic ---
        socket.on('check_status', () => {
            // This allows the frontend to ask "Am I approved yet?" via socket
            // The Admin controller will use getIO().to(userId).emit('identity_approved') 
            // to push the update when they click "Approve"
            console.log(`[SOCKET] User ${socket.user.email} is probing status...`);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Link Severed: ${socket.user.id}`);
        });
    });

    return io;
};

// Function to get the IO instance from other files (like app.js or controllers)
const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

module.exports = { initSocket, getIO };