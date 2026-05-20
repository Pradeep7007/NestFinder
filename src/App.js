/* ==========================================================================
   NESTFINDER - MAIN APPLICATION (STEP 5)
   ========================================================================== */

const { useState, useEffect, useRef, useMemo } = React;

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

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterDistrict, setFilterDistrict] = useState("all");
    const [filterPriceRange, setFilterPriceRange] = useState(10000);
    const [filterVerified, setFilterVerified] = useState(false);

    // Map instances and markers ref
    const mapInstance = useRef(null);
    const markers = useRef([]);

    // Refresh lucide icons
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    // Expose global bridge for marker click
    useEffect(() => {
        window.viewPropertyDetails = (id) => {
            alert(`Selected property ID: ${id}`);
        };
        return () => {
            delete window.viewPropertyDetails;
        };
    }, []);

    // Computed filters logic
    const filteredListings = useMemo(() => {
        return listings.filter(item => {
            const matchQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               item.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchType = filterType === "all" || item.type === filterType;
            const matchDistrict = filterDistrict === "all" || item.district === filterDistrict;
            const matchPrice = item.price <= filterPriceRange;
            const matchVerify = !filterVerified || item.verified;
            return matchQuery && matchType && matchDistrict && matchPrice && matchVerify;
        });
    }, [listings, searchQuery, filterType, filterDistrict, filterPriceRange, filterVerified]);

    // Initialize/update Map
    useEffect(() => {
        if (currentTab !== "browse") return;

        const mapEl = document.getElementById("map");
        if (!mapEl) return;

        if (!mapInstance.current) {
            // San Francisco Center View
            mapInstance.current = L.map("map").setView([37.7749, -122.4194], 12);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);
        }

        // Clear existing markers
        markers.current.forEach(m => m.remove());
        markers.current = [];

        // Add listing markers
        filteredListings.forEach(prop => {
            if (prop.coordinates) {
                const customIcon = L.divIcon({
                    html: `<div style="background: ${prop.verified ? '#10b981' : '#6366f1'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
                    className: 'custom-map-pin',
                    iconSize: [12, 12]
                });

                const marker = L.marker(prop.coordinates, { icon: customIcon })
                    .addTo(mapInstance.current)
                    .bindPopup(`
                        <div style="font-family: var(--font-body); width: 180px;">
                            <strong style="color: var(--text-primary); font-size: 0.95rem;">${prop.title}</strong><br/>
                            <span style="color: #6366f1; font-weight: 700; font-size: 0.9rem;">$${prop.price.toLocaleString()}/mo</span><br/>
                            <button onclick="window.viewPropertyDetails('${prop.id}')" style="margin-top: 8px; width: 100%; border: none; background: #6366f1; color: white; padding: 4px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.75rem;">View details</button>
                        </div>
                    `);
                markers.current.push(marker);
            }
        });

        // Trigger resize
        setTimeout(() => {
            if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 100);

    }, [currentTab, filteredListings]);

    // Clean up map
    useEffect(() => {
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

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
                    <React.Fragment>
                        {/* Search and Filters container */}
                        <div className="search-container">
                            <div className="search-grid">
                                <div className="search-field">
                                    <label>Search Keyword</label>
                                    <input 
                                        type="text" 
                                        placeholder="District, street, or feature..." 
                                        className="search-input"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="search-field">
                                    <label>Property Type</label>
                                    <select 
                                        className="search-select"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="apartment">Apartment</option>
                                        <option value="house">House</option>
                                        <option value="loft">Loft</option>
                                        <option value="studio">Studio</option>
                                    </select>
                                </div>
                                <div className="search-field">
                                    <label>Location District</label>
                                    <select 
                                        className="search-select"
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                    >
                                        <option value="all">All Districts</option>
                                        <option value="Marina">Marina</option>
                                        <option value="Sunset">Sunset</option>
                                        <option value="Mission">Mission</option>
                                        <option value="Pacific Heights">Pacific Heights</option>
                                    </select>
                                </div>
                                <div className="search-field">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <label>Max Rent</label>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                                            ${filterPriceRange.toLocaleString()}/mo
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1500" 
                                        max="10000" 
                                        step="100" 
                                        className="range-slider"
                                        value={filterPriceRange}
                                        onChange={(e) => setFilterPriceRange(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="search-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
                                    <input 
                                        type="checkbox" 
                                        id="verified-only" 
                                        checked={filterVerified} 
                                        onChange={(e) => setFilterVerified(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                    />
                                    <label htmlFor="verified-only" style={{ cursor: 'pointer' }}>Verified Only</label>
                                </div>
                            </div>
                        </div>

                        <div className="browse-section">
                            <div className="listings-container">
                                <div className="listings-header">
                                    <h2>Available Spaces ({filteredListings.length})</h2>
                                </div>
                                <div className="listings-grid">
                                    {filteredListings.map(property => (
                                        <div key={property.id} className="property-card" onClick={() => window.viewPropertyDetails(property.id)}>
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
                            <div className="map-container">
                                <div className="map-header">
                                    <i data-lucide="map"></i> Spatial Viewfinder
                                </div>
                                <div id="map"></div>
                            </div>
                        </div>
                    </React.Fragment>
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
