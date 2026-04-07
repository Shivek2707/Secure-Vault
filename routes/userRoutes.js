const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const User = require('../models/User'); // Ensure User model is imported

// UPDATED ROUTE: Fetches fresh data from DB to include 'status'
router.get('/profile', protect, async (req, res) => {
    try {
        // We fetch fresh from DB because the JWT token might have stale 'status' info
        const freshUser = await User.findById(req.user._id);

        if (!freshUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // CRITICAL: We added 'status' here so the frontend can see 'approved'
        res.json({
            _id: freshUser._id,
            name: freshUser.name,
            email: freshUser.email,
            role: freshUser.role,
            status: freshUser.status || 'quarantine', // The missing link
            avatar: freshUser.avatar
        });
    } catch (err) {
        logger.error({
            event: 'PROFILE_FETCH_ERROR',
            message: err.message,
            userId: req.user._id
        });
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Your existing dashboard route (Fixed logic for BOLA protection)
router.get('/dashboard/:id', protect, (req, res) => {
    const requestedId = req.params.id;
    const loggedInUserId = req.user._id.toString(); // Use _id to match Mongoose standard

    if (requestedId !== loggedInUserId) {
        logger.warn({
            event: 'BOLA_ATTEMPT',
            message: 'Unauthorized access attempt to dashboard',
            attackerId: loggedInUserId,
            targetId: requestedId,
            ip: req.ip
        });

        return res.status(403).json({
            status: 'fail',
            message: 'Security Alert: Access Denied.'
        });
    }

    res.json({
        status: 'success',
        data: 'Private dashboard data accessed.'
    });
});

module.exports = router;