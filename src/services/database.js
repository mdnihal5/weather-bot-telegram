const mongoose = require('mongoose');
const config = require('../config/config');
const Subscriber = require('../models/subscriber');
const Setting = require('../models/setting');

class Database {
    static isConnected = false;

    static async connect() {
        if (this.isConnected) return;
        try {
            await mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log('Connected to MongoDB');
            this.isConnected = true;
            await this.initializeSettings();
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw new Error('Failed to connect to the database');
        }
    }

    static async initializeSettings() {
        const defaultSettings = [
            { key: 'weatherApiKey', value: config.WEATHER_API_KEY },
            { key: 'updateInterval', value: config.UPDATE_INTERVAL }
        ];

        for (const setting of defaultSettings) {
            await Setting.findOneAndUpdate(
                { key: setting.key },
                { value: setting.value },
                { upsert: true, new: true }
            );
        }
    }

    static async addSubscriber(userId, username, city) {
        try {
            const existingSubscriber = await Subscriber.findOne({ userId });
            if (existingSubscriber) {
                if (existingSubscriber.city === city && existingSubscriber.active) {
                    console.log(`User ${username} (${userId}) is already subscribed to city ${city}`);
                    return false;
                } else {
                    existingSubscriber.city = city;
                    existingSubscriber.active = true;
                    await existingSubscriber.save();
                    console.log(`Updated subscription for user ${username} (${userId}) to city ${city}`);
                    return true;
                }
            }

            await Subscriber.create({ userId, username, city, active: true });
            console.log(`Subscribed user ${username} (${userId}) to city ${city}`);
            return true;
        } catch (error) {
            console.error(`Failed to subscribe user ${username} (${userId}) to city ${city}:`, error);
            throw error;
        }
    }

    static async removeSubscriber(userId) {
        try {
            const result = await Subscriber.findOneAndUpdate({ userId }, { active: false });
            if (result) {
                console.log(`Unsubscribed user with ID ${userId}`);
                return true;
            } else {
                console.log(`No user found with ID ${userId} to unsubscribe`);
                return false;
            }
        } catch (error) {
            console.error(`Failed to unsubscribe user with ID ${userId}:`, error);
            throw error;
        }
    }

    static async isSubscribed(userId) {
        try {
            const subscriber = await Subscriber.findOne({ userId, active: true });
            return !!subscriber;
        } catch (error) {
            console.error(`Failed to check subscription status for user ID ${userId}:`, error);
            throw error;
        }
    }

    static async getActiveSubscribers() {
        try {
            return await Subscriber.find({ active: true });
        } catch (error) {
            console.error('Failed to fetch active subscribers:', error);
            throw error;
        }
    }

    static async updateSettings(key, value) {
        try {
            await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
            console.log(`Updated setting ${key} to ${value}`);
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            throw error;
        }
    }

    static async getSetting(key) {
        try {
            const setting = await Setting.findOne({ key });
            return setting?.value || null;
        } catch (error) {
            console.error(`Failed to retrieve setting ${key}:`, error);
            throw error;
        }
    }

    static async toggleSubscriber(userId, active) {
        try {
            const result = await Subscriber.findOneAndUpdate({ userId }, { active }, { new: true });
            if (result) {
                console.log(`User ${userId} has been ${active ? 'unblocked' : 'blocked'}`);
            } else {
                console.log(`No user found with ID ${userId} to ${active ? 'unblock' : 'block'}`);
            }
        } catch (error) {
            console.error(`Failed to ${active ? 'unblock' : 'block'} user ${userId}:`, error);
            throw error;
        }
    }
}

module.exports = Database;

