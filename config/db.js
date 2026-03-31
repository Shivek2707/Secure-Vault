const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Safely');
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;