# NestFinder

NestFinder is a next-generation, client-side real estate platform designed to simplify property discovery, matching, and booking. The application is built using a modern, build-less React architecture that runs entirely in the browser, providing a fast, responsive, and seamless user experience without complex build tools.

## Tech Stack
- **Frontend Core:** React.js (v18) via CDN
- **JSX Compilation:** Babel Standalone (v6)
- **Styling:** Vanilla CSS (CSS Custom Properties, Flexbox, CSS Grid)
- **Maps Integration:** Leaflet.js
- **Icons:** Lucide Icons

## Key Features
1. **Interactive Map Integration:** Real-time property visualization and location tracking using Leaflet.js maps.
2. **AI-Driven Preferences Engine:** Interactive questionnaire to match users with properties based on lifestyle, budget, and location preferences.
3. **Property Chatbot:** Real-time conversational interface to inquire about listings, schedule viewings, or ask policy questions.
4. **Multi-Role Dashboards:**
   - **Buyer/Renter:** Search, filter, view details, map locations, and request bookings.
   - **Owner:** List new properties, manage existing listings, and review booking requests.
   - **Admin:** System-wide overview of listings, users, and booking status.
5. **Secure Checkout Sandbox:** Interactive checkout flow mimicking payment processing.
6. **Community trust & Insights:** Verified listings badges and simulated neighborhood statistics.

## Local Execution Instructions
Since NestFinder runs as a client-side web application, it does not require a local backend server or database installation. 

1. Clone this repository:
   ```bash
   git clone https://github.com/Pradeep7007/NestFinder.git
   ```
2. Navigate to the project directory:
   ```bash
   cd NestFinder
   ```
3. Open `index.html` in any modern web browser, or serve it using a lightweight local web server (e.g., Live Server in VS Code, or `python -m http.server 8000` in the terminal).

## Live Application Link
[Live Deployment Link](https://pradeep7007.github.io/NestFinder/)

## Team & Roles
- **Pradeep7007** — Lead Engineer (Frontend Architecture, UI/UX Design, Map & Feature Implementations)

## Known Limitations
- Local Storage is utilized for session states and listing modifications; actions do not persist across different browsers or devices.
- Chatbot responses and AI-matching are simulated client-side.
