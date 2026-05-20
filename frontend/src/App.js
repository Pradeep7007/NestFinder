/* ==========================================================================
   NESTFINDER - FRONTEND APPLICATION (FULL STACK INTEGRATED)
   ========================================================================== */

const { useState, useEffect, useRef, useMemo } = React;

const API_BASE = "http://localhost:5000/api";

function App() {
    // Session State
    const [userRole, setUserRole] = useState("buyer");
    const [currentTab, setCurrentTab] = useState("browse");
    const [listings, setListings] = useState([]);
    const [bookings, setBookings] = useState([]);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterDistrict, setFilterDistrict] = useState("all");
    const [filterPriceRange, setFilterPriceRange] = useState(150000);
    const [filterVerified, setFilterVerified] = useState(false);

    // Detail Modal State
    const [selectedProperty, setSelectedProperty] = useState(null);

    // Booking / Checkout System State
    const [checkoutProperty, setCheckoutProperty] = useState(null);
    const [bookingDates, setBookingDates] = useState({ checkIn: "", checkOut: "" });
    const [checkoutStatus, setCheckoutStatus] = useState("idle");
    const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvc: "" });
    const [paymentError, setPaymentError] = useState("");

    // AI Matching Engine State
    const [matchAnswers, setMatchAnswers] = useState({
        budget: 60000,
        beds: "any",
        district: "any",
        priority: "none"
    });
    const [isMatchingCalculated, setIsMatchingCalculated] = useState(false);

    // AI Chatbot State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { id: 1, sender: "bot", text: "Namaste! Welcome to NestFinder Ghar Support. How can I help you find your dream flat in Bangalore today?" }
    ]);
    const [chatInput, setChatInput] = useState("");

    // Map instances and markers ref
    const mapInstance = useRef(null);
    const markers = useRef([]);

    // -------------------------------------------------------------
    // BACKEND API CALLS
    // -------------------------------------------------------------

    // Load data from backend on mount
    const loadBackendData = async () => {
        try {
            const listingsRes = await fetch(`${API_BASE}/listings`);
            if (listingsRes.ok) {
                const listingsData = await listingsRes.json();
                setListings(listingsData);
            }
            const bookingsRes = await fetch(`${API_BASE}/bookings`);
            if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                setBookings(bookingsData);
            }
        } catch (err) {
            console.error("Error fetching data from NestFinder backend:", err);
        }
    };

    useEffect(() => {
        loadBackendData();
    }, []);

    // Refresh Lucide icons after state changes and tab switches
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    // Expose global bridge for Leaflet map popups to call detail view
    useEffect(() => {
        window.viewPropertyDetails = (id) => {
            const prop = listings.find(p => p.id === id);
            if (prop) setSelectedProperty(prop);
        };
        return () => {
            delete window.viewPropertyDetails;
        };
    }, [listings]);

    // Computed listings filter logic
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

    // Preference matching calculations
    const matchedListings = useMemo(() => {
        if (!isMatchingCalculated) return [];

        return listings.map(item => {
            let score = 100;

            // Budget Match (INR scale)
            if (item.price > matchAnswers.budget) {
                const difference = item.price - matchAnswers.budget;
                const penalty = Math.min(40, Math.floor(difference / 1000) * 2.5);
                score -= penalty;
            } else {
                score += 5;
            }

            // BHK Match
            if (matchAnswers.beds !== "any") {
                const targetBeds = parseInt(matchAnswers.beds);
                if (item.beds < targetBeds) {
                    score -= 35;
                } else if (item.beds === targetBeds) {
                    score += 10;
                }
            }

            // Locality Match
            if (matchAnswers.district !== "any") {
                if (item.district.toLowerCase() === matchAnswers.district.toLowerCase()) {
                    score += 20;
                } else {
                    score -= 15;
                }
            }

            // Amenity Match
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

    // Initialize/Update Spatial Bhuvan Leaflet Map
    useEffect(() => {
        if (currentTab !== "browse") return;

        const mapEl = document.getElementById("map");
        if (!mapEl) return;

        if (!mapInstance.current) {
            // Center around Bengaluru, India
            mapInstance.current = L.map("map").setView([12.9716, 77.5946], 12);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);
        }

        // Clear pins
        markers.current.forEach(m => m.remove());
        markers.current = [];

        // Plot pins
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

    // -------------------------------------------------------------
    // RESERVATION / CHECKOUT ENGINE (STRIPE SANDBOX)
    // -------------------------------------------------------------
    const handleInitiateBooking = (property) => {
        setCheckoutProperty(property);
        setCheckoutStatus("idle");
        setCardDetails({ number: "", expiry: "", cvc: "" });
        setPaymentError("");
    };

    const checkoutCalculation = useMemo(() => {
        if (!checkoutProperty || !bookingDates.checkIn || !bookingDates.checkOut) return { days: 0, rent: 0, serviceFee: 0, total: 0 };
        const checkInDate = new Date(bookingDates.checkIn);
        const checkOutDate = new Date(bookingDates.checkOut);
        
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) return { days: 0, rent: 0, serviceFee: 0, total: 0 };

        const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
        const days = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        const dailyRate = checkoutProperty.price / 30;
        const rent = Math.round(dailyRate * days);
        const serviceFee = Math.round(rent * 0.08); // 8% escrow processing fee
        const total = rent + serviceFee;

        return { days, rent, serviceFee, total };
    }, [checkoutProperty, bookingDates]);

    const handlePayCheckout = async (e) => {
        e.preventDefault();
        setPaymentError("");

        const { number, expiry, cvc } = cardDetails;

        if (!bookingDates.checkIn || !bookingDates.checkOut) {
            setPaymentError("Please select check-in and check-out dates.");
            return;
        }

        const dateDiff = new Date(bookingDates.checkOut).getTime() - new Date(bookingDates.checkIn).getTime();
        if (dateDiff <= 0) {
            setPaymentError("Check-out date must be after check-in date.");
            return;
        }

        if (!number.replace(/\s/g, '').match(/^\d{16}$/)) {
            setPaymentError("Invalid card number. Must be a 16-digit credit card number.");
            return;
        }

        if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
            setPaymentError("Invalid expiry date MM/YY.");
            return;
        }

        if (!cvc.match(/^\d{3}$/)) {
            setPaymentError("Invalid CVC (3-digit code).");
            return;
        }

        setCheckoutStatus("processing");

        try {
            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: checkoutProperty.id,
                    propertyName: checkoutProperty.title,
                    renterName: userRole === "buyer" ? "Renter Account" : "Owner Account",
                    checkIn: bookingDates.checkIn,
                    checkOut: bookingDates.checkOut,
                    totalPaid: checkoutCalculation.total,
                    ownerId: checkoutProperty.ownerId,
                    cardDetails
                })
            });

            if (res.ok) {
                const newBooking = await res.json();
                setBookings(prev => [newBooking, ...prev]);
                setCheckoutStatus("success");
            } else {
                const data = await res.json();
                setPaymentError(data.error || "Sandbox transaction failed.");
                setCheckoutStatus("idle");
            }
        } catch (err) {
            setPaymentError("Backend server connection failed.");
            setCheckoutStatus("idle");
        }
    };

    // -------------------------------------------------------------
    // CHATBOT CONTROLLER (INTEGRATED)
    // -------------------------------------------------------------
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!chatInput.trim()) return;

        const userText = chatInput.trim();
        const userMsg = { id: chatMessages.length + 1, sender: "user", text: userText };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput("");

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });

            if (res.ok) {
                const data = await res.json();
                setChatMessages(prev => [...prev, { id: prev.length + 1, sender: "bot", text: data.reply }]);
            } else {
                setChatMessages(prev => [...prev, { id: prev.length + 1, sender: "bot", text: "Sorry, I am facing connectivity issues with my backend service." }]);
            }
        } catch (err) {
            setChatMessages(prev => [...prev, { id: prev.length + 1, sender: "bot", text: "I couldn't reach the GharFinder server." }]);
        }
    };

    const handleQuickChatQuestion = async (questionText) => {
        const userMsg = { id: chatMessages.length + 1, sender: "user", text: questionText };
        setChatMessages(prev => [...prev, userMsg]);

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: questionText })
            });

            if (res.ok) {
                const data = await res.json();
                setChatMessages(prev => [...prev, { id: prev.length + 1, sender: "bot", text: data.reply }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // -------------------------------------------------------------
    // OWNER PORTAL & ADMIN CONSOLE ACTIONS
    // -------------------------------------------------------------
    const handleAddListing = async (formData) => {
        try {
            const res = await fetch(`${API_BASE}/listings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newListing = await res.json();
                setListings(prev => [newListing, ...prev]);
            }
        } catch (err) {
            console.error("Error creating listing:", err);
        }
    };

    const handleDeleteListing = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/listings/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setListings(prev => prev.filter(l => l.id !== id));
                if (selectedProperty && selectedProperty.id === id) {
                    setSelectedProperty(null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleVerify = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/listings/${id}/verify`, { method: 'PATCH' });
            if (res.ok) {
                const updated = await res.json();
                setListings(prev => prev.map(l => l.id === id ? updated : l));
                if (selectedProperty && selectedProperty.id === id) {
                    setSelectedProperty(updated);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleBookingStatus = async (id, status) => {
        try {
            const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                const updated = await res.json();
                setBookings(prev => prev.map(b => b.id === id ? updated : b));
            }
        } catch (err) {
            console.error(err);
        }
    };

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
                    {userRole === "owner" && (
                        <li>
                            <span 
                                className={`nav-item ${currentTab === "owner" ? "active" : ""}`}
                                onClick={() => setCurrentTab("owner")}
                            >
                                Owner Portal
                            </span>
                        </li>
                    )}
                    {userRole === "admin" && (
                        <li>
                            <span 
                                className={`nav-item ${currentTab === "admin" ? "active" : ""}`}
                                onClick={() => setCurrentTab("admin")}
                            >
                                Admin Console
                            </span>
                        </li>
                    )}
                </ul>
                <div className="nav-actions">
                    <select 
                        className={`role-badge ${userRole}`} 
                        value={userRole} 
                        onChange={(e) => {
                            const role = e.target.value;
                            setUserRole(role);
                            if (role === "buyer" && (currentTab === "owner" || currentTab === "admin")) {
                                setCurrentTab("browse");
                            } else if (role === "owner" && currentTab === "admin") {
                                setCurrentTab("owner");
                            } else if (role === "admin" && currentTab === "owner") {
                                setCurrentTab("admin");
                            }
                        }}
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
                                        placeholder="Indiranagar, HSR Layout, vastu..." 
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

                                {filteredListings.length === 0 ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                                        <i data-lucide="alert-circle" style={{ width: '48px', height: '48px', color: 'var(--text-muted)', marginBottom: '1rem' }}></i>
                                        <h3>No properties found</h3>
                                        <p style={{ color: 'var(--text-secondary)' }}>Try broadening your search term or updating search boundaries.</p>
                                    </div>
                                ) : (
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
                                )}
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

                {/* TAB CONTENT: OWNER PORTAL */}
                {currentTab === "owner" && userRole === "owner" && (
                    <div className="dashboard-grid">
                        <div className="dashboard-card">
                            <h3>Publish Flat Listing</h3>
                            <OwnerListingForm onAddListing={handleAddListing} />
                        </div>
                        <div className="dashboard-card">
                            <h3>Active Listings & Requests</h3>
                            <div className="dashboard-list" style={{ marginBottom: '2rem' }}>
                                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Your Properties</h4>
                                {listings.filter(l => l.ownerId === "current" || l.ownerId === "owner-1").length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No listings published yet under this session.</p>
                                ) : (
                                    listings.filter(l => l.ownerId === "current" || l.ownerId === "owner-1").map(item => (
                                        <div key={item.id} className="dashboard-list-item">
                                            <div className="dashboard-item-info">
                                                <span className="dashboard-item-title">{item.title}</span>
                                                <span className="dashboard-item-meta">₹{item.price.toLocaleString()}/mo &bull; {item.district} &bull; {item.verified ? 'Verified' : 'Pending Verification'}</span>
                                            </div>
                                            <button 
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteListing(item.id)}
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="dashboard-list">
                                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Renter Inquiries</h4>
                                {bookings.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tenant inquiries recorded.</p>
                                ) : (
                                    bookings.map(book => (
                                        <div key={book.id} className="dashboard-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span className="dashboard-item-title">{book.propertyName}</span>
                                                <span className={`role-badge ${book.status.toLowerCase()}`} style={{ border: 'none', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                                                    {book.status}
                                                </span>
                                            </div>
                                            <div className="dashboard-item-meta">
                                                <strong>Tenant:</strong> {book.renterName} <br />
                                                <strong>Period:</strong> {book.checkIn} to {book.checkOut} <br />
                                                <strong>Security Paid:</strong> ₹{book.totalPaid.toLocaleString()}
                                            </div>
                                            {book.status === "Pending" && (
                                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                                                    <button 
                                                        className="btn btn-success btn-sm"
                                                        style={{ flexGrow: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                                        onClick={() => handleToggleBookingStatus(book.id, "Approved")}
                                                    >
                                                        Approve Visit
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger btn-sm"
                                                        style={{ flexGrow: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                                        onClick={() => handleToggleBookingStatus(book.id, "Rejected")}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: ADMIN CONSOLE */}
                {currentTab === "admin" && userRole === "admin" && (
                    <React.Fragment>
                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="insight-card" style={{ padding: '1.5rem' }}>
                                <div className="insight-val" style={{ fontSize: '2.5rem' }}>{listings.length}</div>
                                <div className="insight-lbl">Total Registered Flats</div>
                            </div>
                            <div className="insight-card" style={{ padding: '1.5rem' }}>
                                <div className="insight-val" style={{ fontSize: '2.5rem' }}>{listings.filter(l => l.verified).length}</div>
                                <div className="insight-lbl">Trust Verified Flats</div>
                            </div>
                            <div className="insight-card" style={{ padding: '1.5rem' }}>
                                <div className="insight-val" style={{ fontSize: '2.5rem' }}>{bookings.length}</div>
                                <div className="insight-lbl">Completed Bookings</div>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <h3>Global Listings Trust Auditor</h3>
                            <div className="dashboard-list">
                                {listings.map(item => (
                                    <div key={item.id} className="dashboard-list-item">
                                        <div className="dashboard-item-info">
                                            <span className="dashboard-item-title">{item.title}</span>
                                            <span className="dashboard-item-meta">₹{item.price.toLocaleString()}/mo &bull; {item.district} &bull; Owner: {item.ownerId}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                className={`btn ${item.verified ? 'btn-secondary' : 'btn-primary'}`}
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                onClick={() => handleToggleVerify(item.id)}
                                            >
                                                {item.verified ? "Revoke Verify" : "Grant Verify"}
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                onClick={() => handleDeleteListing(item.id)}
                                            >
                                                Expel
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </React.Fragment>
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

                                    {/* Booking Date Selections */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Start Date</label>
                                            <input 
                                                type="date" 
                                                className="search-input" 
                                                value={bookingDates.checkIn}
                                                onChange={(e) => setBookingDates(prev => ({ ...prev, checkIn: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>End Date</label>
                                            <input 
                                                type="date" 
                                                className="search-input" 
                                                value={bookingDates.checkOut}
                                                onChange={(e) => setBookingDates(prev => ({ ...prev, checkOut: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%' }}
                                        onClick={() => {
                                            if (!bookingDates.checkIn || !bookingDates.checkOut) {
                                                alert("Please choose check-in and check-out dates first.");
                                                return;
                                            }
                                            const dateDiff = new Date(bookingDates.checkOut).getTime() - new Date(bookingDates.checkIn).getTime();
                                            if (dateDiff <= 0) {
                                                alert("End date must be after start date.");
                                                return;
                                            }
                                            handleInitiateBooking(selectedProperty);
                                        }}
                                    >
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

            {/* CHECKOUT MODAL OVERLAY (STRIPE SANDBOX MOCKUP) */}
            {checkoutProperty && (
                <div className="modal-overlay" onClick={() => setCheckoutProperty(null)}>
                    <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>Secure Site Visit Escrow</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>NestFinder Secure Stripe Sandbox</p>
                            </div>
                            <button className="modal-close" onClick={() => setCheckoutProperty(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ gridTemplateColumns: '1fr', padding: '1.5rem' }}>
                            {checkoutStatus !== "success" ? (
                                <form onSubmit={handlePayCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span>Listing Rate:</span>
                                            <span>₹{checkoutProperty.price.toLocaleString()}/mo</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span>Visit Period:</span>
                                            <span>{checkoutCalculation.days} Days</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                            <span>Security Escrow:</span>
                                            <span>₹{checkoutCalculation.rent.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                            <span>Escrow Fee (8%):</span>
                                            <span>₹{checkoutCalculation.serviceFee.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>
                                            <span>Total Escrow Deposit:</span>
                                            <span>₹{checkoutCalculation.total.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Credit Card Details</label>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <i data-lucide="credit-card" style={{ color: 'var(--text-muted)', width: '18px', height: '18px' }}></i>
                                                <input 
                                                    type="text" 
                                                    placeholder="Card number (Use 4242 4242 4242 4242)" 
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                                                    value={cardDetails.number}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '');
                                                        if (val.length > 16) val = val.substring(0, 16);
                                                        const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                                                        setCardDetails(prev => ({ ...prev, number: formatted }));
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="MM/YY" 
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '50%', fontSize: '0.9rem' }}
                                                    value={cardDetails.expiry}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '');
                                                        if (val.length > 4) val = val.substring(0, 4);
                                                        if (val.length > 2) {
                                                            val = val.substring(0, 2) + '/' + val.substring(2);
                                                        }
                                                        setCardDetails(prev => ({ ...prev, expiry: val }));
                                                    }}
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="CVC" 
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '50%', fontSize: '0.9rem' }}
                                                    value={cardDetails.cvc}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').substring(0, 3);
                                                        setCardDetails(prev => ({ ...prev, cvc: val }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {paymentError && (
                                            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                                                <i data-lucide="alert-triangle" style={{ width: '14px', height: '14px' }}></i> {paymentError}
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '0.8rem' }}
                                        disabled={checkoutStatus === "processing"}
                                    >
                                        {checkoutStatus === "processing" ? "Authorizing Escrow..." : `Pay Escrow Deposit ₹${checkoutCalculation.total.toLocaleString()}`}
                                    </button>
                                </form>
                            ) : (
                                <div style={{ textAlignment: 'center', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '50%', color: 'var(--success)', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
                                        <i data-lucide="check-circle" style={{ width: '32px', height: '32px', margin: 'auto' }}></i>
                                    </div>
                                    <h3>Escrow Deposit Confirmed</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '320px' }}>
                                        Your deposit has been securely authorized and held in sandbox escrow. The owner will review the booking inquiry shortly.
                                    </p>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: 'var(--radius-md)', width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                                        <div><strong>Property:</strong> {checkoutProperty.title}</div>
                                        <div><strong>Period:</strong> {bookingDates.checkIn} to {bookingDates.checkOut}</div>
                                        <div><strong>Escrow Held:</strong> ₹{checkoutCalculation.total.toLocaleString()}</div>
                                        <div><strong>Reference:</strong> TXN-INR-{Math.floor(100000 + Math.random() * 900000)}</div>
                                    </div>
                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ width: '100%' }}
                                        onClick={() => {
                                            setCheckoutProperty(null);
                                            setSelectedProperty(null);
                                        }}
                                    >
                                        Return to Browse
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING CHATBOT WIDGET */}
            <button className="chatbot-trigger" onClick={() => setIsChatOpen(!isChatOpen)}>
                <i data-lucide={isChatOpen ? "x" : "message-square"}></i>
            </button>

            {isChatOpen && (
                <div className="chatbot-panel">
                    <div className="chat-header">
                        <div className="chat-bot-info">
                            <div className="bot-avatar">
                                <i data-lucide="bot" style={{ color: 'white', width: '18px', height: '18px' }}></i>
                            </div>
                            <div>
                                <div className="bot-title">GharBot Support</div>
                                <div className="bot-status">Active Helper</div>
                            </div>
                        </div>
                    </div>
                    <div className="chat-messages">
                        {chatMessages.map(msg => (
                            <div key={msg.id} className={`message ${msg.sender}`}>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="chat-suggested">
                        <button 
                            className="suggested-btn"
                            onClick={() => handleQuickChatQuestion("How does the matching engine work?")}
                        >
                            Matching Algorithm?
                        </button>
                        <button 
                            className="suggested-btn"
                            onClick={() => handleQuickChatQuestion("How do I list my own property?")}
                        >
                            Publish Property?
                        </button>
                        <button 
                            className="suggested-btn"
                            onClick={() => handleQuickChatQuestion("What is the sandbox card number?")}
                        >
                            Payment Sandbox Card?
                        </button>
                    </div>
                    <form className="chat-input-container" onSubmit={handleSendMessage}>
                        <input 
                            type="text" 
                            placeholder="Type a message..." 
                            className="chat-input"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 1rem' }}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </React.Fragment>
    );
}

// Subcomponent: Owner Listing Form
function OwnerListingForm({ onAddListing }) {
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [type, setType] = useState("apartment");
    const [district, setDistrict] = useState("Indiranagar");
    const [beds, setBeds] = useState("2");
    const [baths, setBaths] = useState("2");
    const [image, setImage] = useState("");
    const [description, setDescription] = useState("");
    const [features, setFeatures] = useState("Cauvery Water, Power Backup, Vastu Compliant");

    const [formSubmitted, setFormSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !price || !description) {
            alert("Please fill in Title, Price, and Description.");
            return;
        }

        onAddListing({
            title,
            price,
            type,
            district,
            beds,
            baths,
            image,
            description,
            features
        });

        // Reset
        setTitle("");
        setPrice("");
        setDescription("");
        setImage("");
        setFormSubmitted(true);
        setTimeout(() => setFormSubmitted(false), 3000);
    };

    return (
        <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group form-span-2">
                <label>Listing Title</label>
                <input 
                    type="text" 
                    placeholder="e.g. Indiranagar East-facing 2 BHK flat" 
                    className="search-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>
            <div className="form-group">
                <label>Monthly Rent (₹ INR)</label>
                <input 
                    type="number" 
                    placeholder="e.g. 35000" 
                    className="search-input"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                />
            </div>
            <div className="form-group">
                <label>Property Config Type</label>
                <select className="search-select" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="apartment">Apartment / Flat</option>
                    <option value="house">Independent Villa / House</option>
                    <option value="studio">1 RK / Studio</option>
                </select>
            </div>
            <div className="form-group">
                <label>Locality Neighborhood</label>
                <select className="search-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="Indiranagar">Indiranagar</option>
                    <option value="Koramangala">Koramangala</option>
                    <option value="HSR Layout">HSR Layout</option>
                    <option value="Whitefield">Whitefield</option>
                </select>
            </div>
            <div className="form-group">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ width: '50%' }}>
                        <label>BHK</label>
                        <select className="search-select" value={beds} onChange={(e) => setBeds(e.target.value)}>
                            <option value="1">1 BHK / RK</option>
                            <option value="2">2 BHK</option>
                            <option value="3">3 BHK</option>
                            <option value="4">4 BHK</option>
                        </select>
                    </div>
                    <div style={{ width: '50%' }}>
                        <label>Bathrooms</label>
                        <select className="search-select" value={baths} onChange={(e) => setBaths(e.target.value)}>
                            <option value="1">1 Bath</option>
                            <option value="2">2 Baths</option>
                            <option value="3">3 Baths</option>
                            <option value="4">4 Baths</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="form-group form-span-2">
                <label>Image URL (Unsplash or direct link)</label>
                <input 
                    type="url" 
                    placeholder="Leave empty for generic property photo fallback" 
                    className="search-input"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                />
            </div>
            <div className="form-group form-span-2">
                <label>Features & Highlights (Comma separated)</label>
                <input 
                    type="text" 
                    placeholder="e.g. Cauvery Water, Power Backup, Vastu Compliant" 
                    className="search-input"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                />
            </div>
            <div className="form-group form-span-2">
                <label>Property Description</label>
                <textarea 
                    rows="4" 
                    placeholder="Provide a comprehensive listing description detailing space parameters..."
                    className="search-input"
                    style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                ></textarea>
            </div>
            <div className="form-span-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 2rem' }}>
                    Publish Listing
                </button>
                {formSubmitted && (
                    <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <i data-lucide="check" style={{ width: '16px', height: '16px' }}></i> Published successfully!
                    </span>
                )}
            </div>
        </form>
    );
}

// Mount the App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
