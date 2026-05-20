/* ==========================================================================
   NESTFINDER - MAIN APPLICATION (STEP 3)
   ========================================================================== */

const { useState, useEffect } = React;

// Initial listing database
const DEFAULT_LISTINGS = [
    {
        id: "prop-1",
        title: "Marina Bay Luxury Apartment",
        description: "Experience premium waterfront living in this stunning modern apartment. Features floor-to-ceiling windows, high-end European appliances, and a spacious wrap-around balcony with panoramic bay views.",
        price: 3800,
        type: "apartment",
        beds: 2,
        baths: 2,
        district: "Marina",
        verified: true,
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
        coordinates: [37.8024, -122.4376],
        features: ["Waterfront", "Parking Included", "Pet Friendly", "24/7 Security"],
        insights: {
            medianIncome: "$145,000",
            schoolRating: "9/10",
            walkability: "95%"
        },
        ownerId: "owner-1"
    },
    {
        id: "prop-2",
        title: "Sunset Valley Heights Home",
        description: "A beautiful contemporary family home nestled in the quiet hills. Boasts an open-concept living area, a private landscaped backyard, and close proximity to top-tier schools and local parks.",
        price: 2900,
        type: "house",
        beds: 3,
        baths: 2.5,
        district: "Sunset",
        verified: false,
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        coordinates: [37.7599, -122.4794],
        features: ["Backyard", "Garage", "Storage Room", "Near Transit"],
        insights: {
            medianIncome: "$110,000",
            schoolRating: "8/10",
            walkability: "68%"
        },
        ownerId: "owner-2"
    },
    {
        id: "prop-3",
        title: "Mission District Industrial Loft",
        description: "A trendy converted brick loft offering double-height ceilings, exposed timber beams, and a modern industrial feel. Ideal for urban professionals seeking proximity to tech shuttles, cafes, and nightlife.",
        price: 2200,
        type: "loft",
        beds: 1,
        baths: 1,
        district: "Mission",
        verified: true,
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
        coordinates: [37.7608, -122.4194],
        features: ["Exposed Brick", "Rooftop Access", "High Ceilings", "Tech Shuttle Proximity"],
        insights: {
            medianIncome: "$125,000",
            schoolRating: "7/10",
            walkability: "98%"
        },
        ownerId: "owner-1"
    },
    {
        id: "prop-4",
        title: "Pacific Heights Grand Mansion",
        description: "An elegant, multi-story classic estate with premium architecture and sweeping views of the Golden Gate Bridge. Features formal dining rooms, a wine cellar, and manicured private gardens.",
        price: 7500,
        type: "house",
        beds: 4,
        baths: 4.5,
        district: "Pacific Heights",
        verified: true,
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
        coordinates: [37.7925, -122.4382],
        features: ["Golden Gate View", "Private Gardens", "Wine Cellar", "Gated Security"],
        insights: {
            medianIncome: "$220,000",
            schoolRating: "10/10",
            walkability: "82%"
        },
        ownerId: "owner-3"
    }
];

function App() {
    const [userRole, setUserRole] = useState("buyer");
    const [currentTab, setCurrentTab] = useState("browse");
    const [listings] = useState(DEFAULT_LISTINGS);

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, [currentTab, userRole, listings]);

    return (
        <React.Fragment>
            {/* Header & Navbar */}
            <nav className="navbar">
                <div className="nav-brand" onClick={() => setCurrentTab("browse")}>
                    <i data-lucide="home"></i> NestFinder
                </div>
                <ul className="nav-menu">
                    <li>
                        <span 
                            className={`nav-item ${currentTab === "browse" ? "active" : ""}`}
                            onClick={() => setCurrentTab("browse")}
                        >
                            Browse Listings
                        </span>
                    </li>
                    <li>
                        <span 
                            className={`nav-item ${currentTab === "match" ? "active" : ""}`}
                            onClick={() => setCurrentTab("match")}
                        >
                            Preference Match
                        </span>
                    </li>
                </ul>
                <div className="nav-actions">
                    <select 
                        className={`role-badge ${userRole}`} 
                        value={userRole} 
                        onChange={(e) => setUserRole(e.target.value)}
                    >
                        <option value="buyer">Role: Buyer / Renter</option>
                        <option value="owner">Role: Property Owner</option>
                        <option value="admin">Role: System Admin</option>
                    </select>
                </div>
            </nav>

            <main className="container">
                {/* HERO BLOCK */}
                {currentTab === "browse" && (
                    <div className="hero">
                        <h1>Discover Your Next Sanctuary</h1>
                        <p>Explore trust-verified real estate listings throughout prime locations with interactive spatial mapping and custom suitability tools.</p>
                    </div>
                )}

                {/* BROWSE GRID BLOCK */}
                {currentTab === "browse" && (
                    <div className="browse-section">
                        <div className="listings-container">
                            <div className="listings-header">
                                <h2>Available Spaces ({listings.length})</h2>
                            </div>
                            <div className="listings-grid">
                                {listings.map(property => (
                                    <div key={property.id} className="property-card">
                                        <div className="property-image-container">
                                            <img src={property.image} className="property-image" alt={property.title} />
                                            <span className="card-badge">{property.district}</span>
                                            {property.verified && (
                                                <span className="verified-badge">
                                                    <i data-lucide="check" style={{ width: '12px', height: '12px' }}></i> Verified
                                                </span>
                                            )}
                                        </div>
                                        <div className="property-info">
                                            <div className="property-price">${property.price.toLocaleString()}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/mo</span></div>
                                            <h3 className="property-title">{property.title}</h3>
                                            <div className="property-location">
                                                <i data-lucide="map-pin" style={{ width: '14px', height: '14px' }}></i>
                                                {property.district} District
                                            </div>
                                            <div className="property-features">
                                                <div className="feature-item">
                                                    <i data-lucide="bed" style={{ width: '14px', height: '14px' }}></i>
                                                    {property.beds} {property.beds === 0 ? 'Studio' : property.beds === 1 ? 'Bed' : 'Beds'}
                                                </div>
                                                <div className="feature-item">
                                                    <i data-lucide="bath" style={{ width: '14px', height: '14px' }}></i>
                                                    {property.baths} {property.baths === 1 ? 'Bath' : 'Baths'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {currentTab !== "browse" && (
                    <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
                        <h2>Tab: {currentTab} Under Construction</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>This module is currently being configured.</p>
                    </div>
                )}
            </main>
        </React.Fragment>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
