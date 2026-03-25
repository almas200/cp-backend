const Activity = require("../models/Activity");

const logActivity = async ({ type, message, user = null, metadata = {} }) => {
    try {
        await Activity.create({
            type,
            message,
            user,
            metadata,
        });
        console.log(`[ACTIVITY LOGGED] ${type}: ${message}`);
    } catch (err) {
        console.error("Failed to log activity:", err.message);
    }
};

module.exports = { logActivity };
