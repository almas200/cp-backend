const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// ✅ 1. CREATE RAZORPAY ORDER (SIMULATED)
// POST /api/payments/create-order
exports.createOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Simulating Razorpay Order ID format: order_Kju9283jsd8
        const rzpOrderId = `order_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;

        res.status(200).json({
            success: true,
            id: rzpOrderId, // Razorpay uses .id for order id
            amount: course.price * 100, // Razorpay uses paise
            currency: 'INR',
            key: 'rzp_test_KaviDemo123' // Dummy Key
        });
    } catch (error) {
        console.error('Payment Create Order Error:', error);
        res.status(500).json({ success: false, message: 'Server error generating order' });
    }
};

// ✅ 2. VERIFY RAZORPAY PAYMENT & ENROLL (SIMULATED)
// POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
    try {
        const { courseId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user._id;

        if (!courseId || !razorpay_payment_id || !razorpay_order_id) {
            return res.status(400).json({ success: false, message: 'Tampered payment details' });
        }

        // Simulation: Signature check
        // In real app: crypto.createHmac('sha256', secret).update(order_id + "|" + payment_id).digest('hex')
        if (razorpay_signature === 'INVALID') {
            return res.status(400).json({ success: false, message: 'Payment verification failed (Invalid Signature)' });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        let enrollment = await Enrollment.findOne({ userId, courseId });
        if (enrollment) {
            return res.status(200).json({ success: true, message: 'Already enrolled' });
        }

        enrollment = new Enrollment({
            userId,
            courseId,
            status: 'active',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        });

        await enrollment.save();

        res.status(200).json({
            success: true,
            message: 'Access Granted. Welcome to the course!',
            enrollment
        });
    } catch (error) {
        console.error('Payment Verify Error:', error);
        res.status(500).json({ success: false, message: 'Verification logic encountered an error' });
    }
};
