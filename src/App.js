/* ==========================================================================
   NESTFINDER - MAIN APPLICATION (STEP 2)
   ========================================================================== */

const { useState, useEffect } = React;

function App() {
    const [userRole, setUserRole] = useState("buyer");
    const [currentTab, setCurrentTab] = useState("browse");

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, [currentTab, userRole]);

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
