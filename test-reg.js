require('dotenv').config();
const mongoose = require('mongoose');
const { register } = require('./controllers/authController');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);

    const req = { body: { name: 'TestUser999', email: 'test999@example.com', password: 'password123' } };
    const res = {
        status: (c) => {
            return { json: (d) => console.log('Status:', c, 'Response:', d) }
        }
    };

    try {
        // Override console.error temporarily to capture stack
        const origError = console.error;
        console.error = (...args) => {
            origError('CAPTURED ERROR:', ...args);
        };
        await register(req, res);
    } catch (e) {
        console.log('CRASH:', e);
    }
    mongoose.connection.close();
}
test();
