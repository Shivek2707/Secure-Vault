const mongoose = require('mongoose');

const connectDB = async () => {
    // This LOG is crucial - it will tell us what the server sees
    console.log("DEBUG: Attempting connection with URI:", process.env.MONGO_URI ? "FOUND" : "UNDEFINED");

    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("MONGO_URI is missing from process.env");
        }
        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected Safely');
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;