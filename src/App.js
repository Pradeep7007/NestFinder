/* ==========================================================================
   NESTFINDER - REACT SHELL (STEP 1)
   ========================================================================== */

const { useState, useEffect } = React;

function App() {
    return (
        <div className="app-shell">
            <header style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)' }}>NestFinder</h1>
            </header>
            <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Initializing Platform Shell</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Setting up design tokens and workspace components...</p>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
