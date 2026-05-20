/* ==========================================================================
   NESTFINDER - MAIN APPLICATION (STEP 7 - INDIAN LOCALIZATION)
   ========================================================================== */

const { useState, useEffect, useRef, useMemo } = React;

// Initial listing database with Indian context
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
        description: "Beautiful 3 BHK independent villa/house in Koramangala 4th Block. Features private car parking, modular kitchen, small terrace garden, and a quiet surroundings. Ideal for families.",
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

function App() {
    const [userRole, setUserRole] = useState("buyer");
    const [currentTab, setCurrentTab] = useState("browse");
    const [listings] = useState(DEFAULT_LISTINGS);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterDistrict, setFilterDistrict] = useState("all");
    const [filterPriceRange, setFilterPriceRange] = useState(150000);
    const [filterVerified, setFilterVerified] = useState(false);

    // Detail Modal State
    const [selectedProperty, setSelectedProperty] = useState(null);

    // AI Matching Engine State
    const [matchAnswers, setMatchAnswers] = useState({
        budget: 60000,
        beds: "any",
        district: "any",
        priority: "none"
    });
    const [isMatchingCalculated, setIsMatchingCalculated] = useState(false);

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
            const prop = listings.find(p => p.id === id);
            if (prop) setSelectedProperty(prop);
        };
        return () => {
            delete window.viewPropertyDetails;
        };
    }, [listings]);

    // Computed filters logic
    const filteredListings = useMemo(() => {
        return listings.filter(item => {
            const matchQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               item.district.toLowerCase().includes(searchQuery.toLowerCase());
            const matchType = filterType === "all" || item.type === filterType;
            const matchDistrict = filterDistrict === "all" || item.district === filterDistrict;
            const matchPrice = item.price <= filterPriceRange;
            const matchVerify = !filterVerified || item.verified;
            return matchQuery && matchType && matchDistrict && matchPrice && matchVerify;
        });
    }, [listings, searchQuery, filterType, filterDistrict, filterPriceRange, filterVerified]);

    // Preference matching engine calculation
    const matchedListings = useMemo(() => {
        if (!isMatchingCalculated) return [];

        return listings.map(item => {
            let score = 100;

            // Budget Matching (INR scale)
            if (item.price > matchAnswers.budget) {
                const difference = item.price - matchAnswers.budget;
                const penalty = Math.min(40, Math.floor(difference / 1000) * 2.5);
                score -= penalty;
            } else {
                score += 5;
            }

            // BHK Matching
            if (matchAnswers.beds !== "any") {
                const targetBeds = parseInt(matchAnswers.beds);
                if (item.beds < targetBeds) {
                    score -= 35;
                } else if (item.beds === targetBeds) {
                    score += 10;
                }
            }

            // Locality preference
            if (matchAnswers.district !== "any") {
                if (item.district.toLowerCase() === matchAnswers.district.toLowerCase()) {
                    score += 20;
                } else {
                    score -= 15;
                }
            }

            // Priorities
            if (matchAnswers.priority === "verified" && !item.verified) {
                score -= 30;
            } else if (matchAnswers.priority === "transit" && item.features.join(" ").toLowerCase().includes("metro")) {
                score += 15;
            } else if (matchAnswers.priority === "vastu" && item.features.join(" ").toLowerCase().includes("vastu")) {
                score += 15;
            }

            const finalPercent = Math.max(0, Math.min(100, score));

            return {
                ...item,
                matchScore: finalPercent
            };
        }).sort((a, b) => b.matchScore - a.matchScore);

    }, [listings, matchAnswers, isMatchingCalculated]);

    // Initialize/update Map
    useEffect(() => {
        if (currentTab !== "browse") return;

        const mapEl = document.getElementById("map");
        if (!mapEl) return;

        if (!mapInstance.current) {
            // Bangalore City Center View
            mapInstance.current = L.map("map").setView([12.9716, 77.5946], 12);
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
                            <span style="color: #6366f1; font-weight: 700; font-size: 0.9rem;">₹${prop.price.toLocaleString()}/mo</span><br/>
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
                <div className="nav-brand" onClick={() => { setCurrentTab("browse"); setIsMatchingCalculated(false); }}>
                    <i data-lucide="home"></i> NestFinder
                </div>
                <ul className="nav-menu">
                    <li>
                        <span 
                            className={`nav-item ${currentTab === "browse" ? "active" : ""}`}
                            onClick={() => { setCurrentTab("browse"); setIsMatchingCalculated(false); }}
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
                        <option value="buyer">Role: Tenant / Buyer</option>
                        <option value="owner">Role: Flat Owner</option>
                        <option value="admin">Role: System Admin</option>
                    </select>
                </div>
            </nav>

            <main className="container">
                {/* HERO BLOCK */}
                {currentTab === "browse" && (
                    <div className="hero">
                        <h1>Discover Your Next Ghar</h1>
                        <p>Explore trust-verified flats, villas, and independent houses across prime Indian localities with interactive mapping and suitability engines.</p>
                    </div>
                )}

                {/* BROWSE GRID BLOCK */}
                {currentTab === "browse" && (
                    <React.Fragment>
                        {/* Search and Filters container */}
                        <div className="search-container">
                            <div className="search-grid">
                                <div className="search-field">
                                    <label>Search Locality or Term</label>
                                    <input 
                                        type="text" 
                                        placeholder="Indiranagar, HSR, vastu..." 
                                        className="search-input"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="search-field">
                                    <label>Property Config</label>
                                    <select 
                                        className="search-select"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                    >
                                        <option value="all">All Configs</option>
                                        <option value="apartment">Apartment / Flat</option>
                                        <option value="house">Independent Villa / House</option>
                                        <option value="studio">1 RK / Studio</option>
                                    </select>
                                </div>
                                <div className="search-field">
                                    <label>Locality</label>
                                    <select 
                                        className="search-select"
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                    >
                                        <option value="all">All Localities</option>
                                        <option value="Indiranagar">Indiranagar</option>
                                        <option value="Koramangala">Koramangala</option>
                                        <option value="HSR Layout">HSR Layout</option>
                                        <option value="Whitefield">Whitefield</option>
                                    </select>
                                </div>
                                <div className="search-field">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <label>Max Rent</label>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                                            ₹{filterPriceRange.toLocaleString()}/mo
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10000" 
                                        max="150000" 
                                        step="1000" 
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
                                    <h2>Available Homes ({filteredListings.length})</h2>
                                </div>
                                <div className="listings-grid">
                                    {filteredListings.map(property => (
                                        <div key={property.id} className="property-card" onClick={() => setSelectedProperty(property)}>
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
                                                <div className="property-price">₹{property.price.toLocaleString()}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/mo</span></div>
                                                <h3 className="property-title">{property.title}</h3>
                                                <div className="property-location">
                                                    <i data-lucide="map-pin" style={{ width: '14px', height: '14px' }}></i>
                                                    {property.district}, Bengaluru
                                                </div>
                                                <div className="property-features">
                                                    <div className="feature-item">
                                                        <i data-lucide="home" style={{ width: '14px', height: '14px' }}></i>
                                                        {property.beds === 1 && property.type === "studio" ? "1 RK" : `${property.beds} BHK`}
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
                                    <i data-lucide="map"></i> Interactive Bhuvan Map
                                </div>
                                <div id="map"></div>
                            </div>
                        </div>
                    </React.Fragment>
                )}

                {/* TAB CONTENT: PREFERENCE MATCH */}
                {currentTab === "match" && (
                    <div className="matching-engine">
                        <div className="engine-header">
                            <h2>Ghar Preference Suitability Engine</h2>
                            <p>Configure your criteria to rank properties based on custom calculations tailored to your lifestyle parameters.</p>
                        </div>

                        {!isMatchingCalculated ? (
                            <React.Fragment>
                                <div className="question-card">
                                    <div className="question-title">1. What is your absolute maximum monthly rental budget?</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600' }}>₹10,000</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.25rem' }}>₹{matchAnswers.budget.toLocaleString()} / mo</span>
                                        <span style={{ fontWeight: '600' }}>₹1,50,000+</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10000" 
                                        max="150000" 
                                        step="2000" 
                                        className="range-slider"
                                        value={matchAnswers.budget}
                                        onChange={(e) => setMatchAnswers(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                                    />
                                </div>

                                <div className="question-card">
                                    <div className="question-title">2. Select your desired BHK configuration:</div>
                                    <div className="option-boxes">
                                        {["any", "1", "2", "3", "4"].map((val) => (
                                            <div 
                                                key={val} 
                                                className={`option-box ${matchAnswers.beds === val ? "active" : ""}`}
                                                onClick={() => setMatchAnswers(prev => ({ ...prev, beds: val }))}
                                            >
                                                {val === "any" ? "Any BHK" : `${val} BHK`}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="question-card">
                                    <div className="question-title">3. What is your preferred locality in Bengaluru?</div>
                                    <div className="option-boxes">
                                        {["any", "Indiranagar", "Koramangala", "HSR Layout", "Whitefield"].map((dist) => (
                                            <div 
                                                key={dist} 
                                                className={`option-box ${matchAnswers.district === dist ? "active" : ""}`}
                                                onClick={() => setMatchAnswers(prev => ({ ...prev, district: dist }))}
                                            >
                                                {dist === "any" ? "No Preference" : dist}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="question-card">
                                    <div className="question-title">4. Select your main domestic priority:</div>
                                    <div className="option-boxes">
                                        {[
                                            { key: "none", val: "No Preference" },
                                            { key: "verified", val: "Owner Verified Only" },
                                            { key: "transit", val: "Metro Connectivity" },
                                            { key: "vastu", val: "Vastu Compliant Flat" }
                                        ].map((pri) => (
                                            <div 
                                                key={pri.key} 
                                                className={`option-box ${matchAnswers.priority === pri.key ? "active" : ""}`}
                                                onClick={() => setMatchAnswers(prev => ({ ...prev, priority: pri.key }))}
                                            >
                                                {pri.val}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    className="btn btn-primary" 
                                    style={{ padding: '1rem', width: '100%', fontSize: '1rem', marginTop: '1rem' }}
                                    onClick={() => setIsMatchingCalculated(true)}
                                >
                                    Calculate Suitability Rankings
                                </button>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3>Calculated Suitability Rankings</h3>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setIsMatchingCalculated(false)}
                                    >
                                        Edit Parameters
                                    </button>
                                </div>

                                <div className="listings-grid">
                                    {matchedListings.map(property => (
                                        <div key={property.id} className="property-card" onClick={() => setSelectedProperty(property)}>
                                            <div className="property-image-container">
                                                <img src={property.image} className="property-image" alt={property.title} />
                                                <span className="card-badge">{property.district}</span>
                                                <span className="match-score-badge">
                                                    {property.matchScore}% Match
                                                </span>
                                            </div>
                                            <div className="property-info">
                                                <div className="property-price">₹{property.price.toLocaleString()}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/mo</span></div>
                                                <h3 className="property-title">{property.title}</h3>
                                                <div className="property-location">
                                                    <i data-lucide="map-pin" style={{ width: '14px', height: '14px' }}></i>
                                                    {property.district}, Bengaluru
                                                </div>
                                                <div className="property-features">
                                                    <div className="feature-item">
                                                        <i data-lucide="home" style={{ width: '14px', height: '14px' }}></i>
                                                        {property.beds === 1 && property.type === "studio" ? "1 RK" : `${property.beds} BHK`}
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
                            </React.Fragment>
                        )}
                    </div>
                )}
            </main>

            {/* DETAIL MODAL */}
            {selectedProperty && (
                <div className="modal-overlay" onClick={() => setSelectedProperty(null)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ fontSize: '1.4rem' }}>{selectedProperty.title}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                    <i data-lucide="map-pin" style={{ width: '12px', height: '12px' }}></i>
                                    {selectedProperty.district}, Bengaluru
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedProperty(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-main-col">
                                <img src={selectedProperty.image} className="modal-image" alt={selectedProperty.title} />
                                <div>
                                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>Property Description</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{selectedProperty.description}</p>
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Key Highlights</h3>
                                    <div className="modal-features-list">
                                        {selectedProperty.features.map((feat, idx) => (
                                            <div key={idx} className="modal-feature-tag">
                                                <i data-lucide="check-circle" style={{ width: '14px', height: '14px', color: 'var(--primary)' }}></i>
                                                {feat}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-side-col">
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monthly Rental Rate</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', fontFamily: 'var(--font-heading)', margin: '0.25rem 0 1rem' }}>
                                        ₹{selectedProperty.price.toLocaleString()}
                                        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/mo</span>
                                    </div>
                                    <button className="btn btn-primary" style={{ width: '100%' }}>
                                        Book Site Visit
                                    </button>
                                </div>

                                <div>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Locality Parameters</h3>
                                    <div className="insights-grid">
                                        <div className="insight-card">
                                            <div className="insight-val">{selectedProperty.insights?.walkability || "N/A"}</div>
                                            <div className="insight-lbl">Walkability</div>
                                        </div>
                                        <div className="insight-card">
                                            <div className="insight-val">{selectedProperty.insights?.schoolRating || "N/A"}</div>
                                            <div className="insight-lbl">Schools</div>
                                        </div>
                                        <div className="insight-card">
                                            <div className="insight-val" style={{ fontSize: '1rem', paddingTop: '0.2rem' }}>{selectedProperty.insights?.medianIncome || "N/A"}</div>
                                            <div className="insight-lbl">Water Source</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
