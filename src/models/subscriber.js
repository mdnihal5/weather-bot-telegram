const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: String,
    city: { type: String, required: true },
    active: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);

