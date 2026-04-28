const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51O1J...dummy...key'); // Fallback for dev

const createCheckoutSession = async (req, res) => {
    try {
        const { product } = req.body;
        const frontendUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: product.name,
                            description: product.description,
                        },
                        unit_amount: Math.round(product.price * 100), // Stripe uses minor units (paise)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}?success=true`,
            cancel_url: `${frontendUrl}/product/${product._id}?canceled=true`,
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ message: 'Internal Server Error (Stripe)' });
    }
};

module.exports = { createCheckoutSession };
