const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default Indian/Bengaluru listings
const DEFAULT_LISTINGS = [
    {
        id: "prop-1",
        title: "Indiranagar Premium 2 BHK Flat",
        description: "Spacious 2 BHK semi-furnished apartment in prime Indiranagar. East-facing, vastu compliant, featuring 24/7 Cauvery water supply, power backup, and a wide balcony overlooking the green canopy.",
        price: 35000,
        type: "apartment",
        beds: 2,
        baths: 2,
        district: "Indiranagar",
        verified: true,
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
        coordinates: [12.9784, 77.6408],
        features: ["Cauvery Water", "Power Backup", "Vastu Compliant", "Metro Nearby"],
        insights: {
            medianIncome: "Corporation",
            schoolRating: "9/10",
            walkability: "95%"
        },
        ownerId: "owner-1"
    },
    {
        id: "prop-2",
        title: "Koramangala 3 BHK Independent House",
        description: "Beautiful 3 BHK independent villa/house in Koramangala 4th Block. Features private car parking, modular kitchen, small terrace garden, and quiet surroundings. Ideal for families.",
        price: 55000,
        type: "house",
        beds: 3,
        baths: 3,
        district: "Koramangala",
        verified: false,
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        coordinates: [12.9352, 77.6244],
        features: ["Terrace Garden", "Covered Parking", "Security Guard", "Quiet Lane"],
        insights: {
            medianIncome: "Cauvery/Bore",
            schoolRating: "8/10",
            walkability: "88%"
        },
        ownerId: "owner-2"
    },
    {
        id: "prop-3",
        title: "HSR Layout Modern 1 RK Studio",
        description: "Sleek 1 BHK/1 RK studio apartment perfect for tech professionals. Fully furnished with smart appliances, high-speed Wi-Fi, and quick access to major IT parks.",
        price: 18000,
        type: "studio",
        beds: 1,
        baths: 1,
        district: "HSR Layout",
        verified: true,
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
        coordinates: [12.9128, 77.6387],
        features: ["Fully Furnished", "Gated Society", "Lift Access", "IT Park Proximity"],
        insights: {
            medianIncome: "Borewell",
            schoolRating: "7/10",
            walkability: "92%"
        },
        ownerId: "owner-1"
    },
    {
        id: "prop-4",
        title: "Whitefield Luxury 4 BHK Villa",
        description: "Prestige gated community luxury villa in Whitefield. Sprawling 4 BHK with premium woodwork, private garden, servant quarters, and access to clubhouse and swimming pool.",
        price: 95000,
        type: "house",
        beds: 4,
        baths: 4,
        district: "Whitefield",
        verified: true,
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
        coordinates: [12.9698, 77.7500],
        features: ["Gated Community", "Clubhouse Gym", "Private Garden", "Servant Room"],
        insights: {
            medianIncome: "Water Tanker",
            schoolRating: "10/10",
            walkability: "70%"
        },
        ownerId: "owner-3"
    }
];

// Helper to read database
function readData(filePath, defaultData) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
            return defaultData;
        }
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        console.error(`Error reading database file ${filePath}:`, err);
        return defaultData;
    }
}

// Helper to write database
function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`Error writing database file ${filePath}:`, err);
    }
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Listings
app.get('/api/listings', (req, res) => {
    const listings = readData(LISTINGS_FILE, DEFAULT_LISTINGS);
    res.json(listings);
});

app.post('/api/listings', (req, res) => {
    const listings = readData(LISTINGS_FILE, DEFAULT_LISTINGS);
    const { title, description, price, type, beds, baths, district, image, features, ownerId } = req.body;

    if (!title || !price || !description || !district) {
        return res.status(400).json({ error: "Missing required listing parameters." });
    }

    // Default coordinates center around Bengaluru based on locality
    let baseCoords = [12.9716, 77.5946];
    if (district.toLowerCase() === "indiranagar") baseCoords = [12.9784, 77.6408];
    else if (district.toLowerCase() === "koramangala") baseCoords = [12.9352, 77.6244];
    else if (district.toLowerCase() === "hsr layout") baseCoords = [12.9128, 77.6387];
    else if (district.toLowerCase() === "whitefield") baseCoords = [12.9698, 77.7500];

    // Jitter coordinates slightly
    const coordinates = [
        baseCoords[0] + (Math.random() - 0.5) * 0.015,
        baseCoords[1] + (Math.random() - 0.5) * 0.015
    ];

    const newListing = {
        id: `prop-${Date.now()}`,
        title,
        description,
        price: parseInt(price),
        type,
        beds: parseInt(beds) || 2,
        baths: parseFloat(baths) || 2,
        district,
        verified: false,
        image: image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
        coordinates,
        features: Array.isArray(features) ? features : features.split(',').map(f => f.trim()).filter(Boolean),
        insights: {
            medianIncome: "Borewell & Corporation",
            schoolRating: "8/10",
            walkability: `${Math.floor(Math.random() * 25) + 70}%`
        },
        ownerId: ownerId || "current"
    };

    listings.unshift(newListing);
    writeData(LISTINGS_FILE, listings);
    res.status(201).json(newListing);
});

app.delete('/api/listings/:id', (req, res) => {
    const listings = readData(LISTINGS_FILE, DEFAULT_LISTINGS);
    const updated = listings.filter(item => item.id !== req.params.id);
    writeData(LISTINGS_FILE, updated);
    res.json({ success: true, message: "Listing deleted successfully." });
});

app.patch('/api/listings/:id/verify', (req, res) => {
    const listings = readData(LISTINGS_FILE, DEFAULT_LISTINGS);
    const item = listings.find(l => l.id === req.params.id);
    if (!item) {
        return res.status(404).json({ error: "Listing not found." });
    }
    item.verified = !item.verified;
    writeData(LISTINGS_FILE, listings);
    res.json(item);
});

// Bookings
app.get('/api/bookings', (req, res) => {
    const bookings = readData(BOOKINGS_FILE, []);
    res.json(bookings);
});

app.post('/api/bookings', (req, res) => {
    const bookings = readData(BOOKINGS_FILE, []);
    const { propertyId, propertyName, renterName, checkIn, checkOut, totalPaid, ownerId, cardDetails } = req.body;

    if (!propertyId || !checkIn || !checkOut || !cardDetails) {
        return res.status(400).json({ error: "Incomplete reservation details." });
    }

    const { number, expiry, cvc } = cardDetails;

    // Sandbox validation
    if (!number.replace(/\s/g, '').match(/^\d{16}$/)) {
        return res.status(400).json({ error: "Invalid card number. Must be 16 digits." });
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
        return res.status(400).json({ error: "Invalid expiry date (MM/YY)." });
    }
    if (!cvc.match(/^\d{3}$/)) {
        return res.status(400).json({ error: "Invalid CVC. Must be 3 digits." });
    }

    const newBooking = {
        id: `book-${Date.now()}`,
        propertyId,
        propertyName,
        renterName: renterName || "Guest Tenant",
        checkIn,
        checkOut,
        totalPaid: parseInt(totalPaid),
        status: "Pending",
        ownerId: ownerId || "owner-1"
    };

    bookings.unshift(newBooking);
    writeData(BOOKINGS_FILE, bookings);
    res.status(201).json(newBooking);
});

app.patch('/api/bookings/:id/status', (req, res) => {
    const bookings = readData(BOOKINGS_FILE, []);
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
        return res.status(404).json({ error: "Booking record not found." });
    }
    booking.status = req.body.status;
    writeData(BOOKINGS_FILE, bookings);
    res.json(booking);
});

// Chatbot Engine Response
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Empty query message." });
    }

    const query = message.toLowerCase();
    let botReply = "";

    if (query.includes("pricing") || query.includes("rent") || query.includes("price") || query.includes("cost")) {
        botReply = "Flats and villas on GharFinder range from ₹18,000/mo to ₹95,000/mo. You can adjust the Max Rent slider in the filters to browse within your exact budget limit.";
    } else if (query.includes("match") || query.includes("engine") || query.includes("find")) {
        botReply = "Our Ghar Preference Suitability Engine matches lists against your maximum budget, desired BHK count, preferred locality, and options like vastu compliance or metro proximity.";
    } else if (query.includes("verify") || query.includes("verified")) {
        botReply = "Verified properties carry a green check badge. This confirms our team has physically checked the layout, verified ownership papers, and checked for issues. Admin accounts can change property verification status.";
    } else if (query.includes("checkout") || query.includes("book") || query.includes("pay") || query.includes("reserve")) {
        botReply = "To book a flat visit/reservation, click 'Book Site Visit' on a listing, enter your check-in dates, and process payment using the Stripe sandbox card '4242 4242 4242 4242'.";
    } else if (query.includes("owner") || query.includes("list")) {
        botReply = "To upload your own property, switch your account role to 'Flat Owner' in the top-right navbar. This opens the Owner Portal where you can input flat details and approve site visit requests.";
    } else if (query.includes("indiranagar") || query.includes("koramangala") || query.includes("hsr") || query.includes("whitefield") || query.includes("bengaluru") || query.includes("bangalore")) {
        botReply = "We have prime options in popular Bengaluru hubs, including Indiranagar (Premium flats near Metro), Koramangala (independent family houses), HSR Layout (cozy 1 RK studios for tech professionals), and Whitefield (spacious luxury villas). Check the Bhuvan map sidebar to view their locations.";
    } else if (query.includes("vastu")) {
        botReply = "Yes! Many of our listings (like our Indiranagar premium 2 BHK flat) are east-facing and 100% Vastu compliant. You can filter or search 'vastu' to find them.";
    } else if (query.includes("water") || query.includes("cauvery")) {
        botReply = "Water supply is a key metric on our details page. We show if a locality uses Cauvery Corporation water, Borewell supply, or Water tankers, so you can choose confidently.";
    } else {
        botReply = "Namaste! I am GharBot, your NestFinder helper. I can tell you about our Bangalore flat availability, local rent ranges (₹), Vastu configurations, and how to list properties. How can I help you today?";
    }

    res.json({ reply: botReply });
});

app.listen(PORT, () => {
    console.log(`NestFinder full-stack backend running at http://localhost:${PORT}`);
});
