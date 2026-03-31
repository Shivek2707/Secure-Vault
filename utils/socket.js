const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io; // Hold the instance globally in this file

const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: "*" } 
    });

    // Middleware: Auth check
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
            if (err) return next(new Error("Invalid token"));
            socket.user = decoded; 
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        // Join a private room based on User ID for targeted signals (like approval)
        socket.join(socket.user.id);

        socket.on('send_message', (data) => {
            const cleanMessage = data.message.replace(/<[^>]*>?/gm, ''); 
            io.emit('receive_message', {
                message: cleanMessage, // Match your frontend 'm.message'
                senderName: data.senderName,
                senderEmail: data.senderEmail,
                time: new Date().toLocaleTimeString()
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

// Function to get the IO instance from other files (like app.js)
const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

module.exports = { initSocket, getIO };