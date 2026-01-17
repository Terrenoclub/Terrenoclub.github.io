# Terreno Club Web

Marketing website for Terreno Club, a members-only club in El Terreno, Palma, Mallorca offering padel courts, a heated saltwater pool, and restaurant.

## Tech Stack

- Vanilla JavaScript (ES6)
- HTML5 / CSS3 with custom properties
- Custom i18n system (English/Spanish)
- Node.js server for local development

No build process required — pure static assets.

## Getting Started

```bash
npm install
npm start
```

The site will be available at `http://localhost:3000`

### Server Options

```bash
node server.js --port=8080    # Custom port
node server.js --silent       # Disable request logging
```

## Project Structure

```
├── index.html              # Main single-page site
├── privacy.html            # Privacy policy
├── rules.html              # House rules
├── terms.html              # Terms and conditions
├── server.js               # Local dev server
│
├── assets/
│   ├── css/site.css        # Global styles
│   ├── js/
│   │   ├── site.js         # Main app (i18n, navigation, animations)
│   │   ├── layout.js       # Partial loading system
│   │   └── tabs.js         # Tab/accordion component
│   └── i18n/
│       ├── en.json         # English translations
│       └── es.json         # Spanish translations
│
├── partials/               # Reusable HTML fragments
│   ├── header-drawer.html  # Mobile navigation drawer
│   ├── header.html         # Desktop header
│   └── footer.html         # Site footer
│
├── images/                 # Photography and graphics
├── fonts/                  # Custom web fonts
└── titles_images/          # SVG section title graphics
```

## Features

- **Internationalization**: Dynamic language switching (EN/ES) with localStorage persistence
- **Responsive Design**: Mobile-first with drawer navigation on small screens
- **Scroll Animations**: IntersectionObserver-based fade-in effects
- **Accessibility**: ARIA-compliant, keyboard navigation, semantic HTML
- **Booking Integration**: Dish.co widget for table reservations

## Deployment

Static site — deploy to any web server, CDN, or hosting platform (Netlify, Vercel, Cloudflare Pages, etc.).
