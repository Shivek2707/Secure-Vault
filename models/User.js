const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  googleId: String,
  avatar: String,
  // ADD THIS FIELD:
  status: {
    type: String,
    enum: ['pending','quarantine', 'approved'],
    default: 'pending' // Defaults to pending if not specified
  },
  role: { type: String, default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);