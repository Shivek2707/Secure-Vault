require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel'); // Ensure this path is correct

const migrateUsers = async () => {
    try {
        // 1. Connect to your DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📡 Connected to MongoDB for Migration...");

        // 2. Set everyone to 'pending' if they don't have a status
        const result = await User.updateMany(
            { status: { $exists: false } }, 
            { $set: { status: 'pending' } }
        );
        console.log(`✅ Updated ${result.modifiedCount} users to 'pending' status.`);

        // 3. Ensure your Admin email is ALWAYS approved
        const adminEmail = 'shiveksingh43@gmail.com';
        const adminUpdate = await User.updateOne(
            { email: adminEmail },
            { $set: { status: 'approved', role: 'admin' } }
        );
        
        if (adminUpdate.matchedCount > 0) {
            console.log(`👑 Admin (${adminEmail}) status forced to 'approved'.`);
        } else {
            console.log(`⚠️ Admin email not found in DB. Login once first, then re-run this.`);
        }

        console.log("🚀 Migration Complete. Closing connection...");
        process.exit();
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
};

migrateUsers();