// src/pages/AboutPage.jsx
// Premium “About” page with alternating image/text slices and a hero section.
// Fits your existing architecture (MenuButton + view switch in App.js).

import React from 'react';
import './AboutPage.css';
import Logo from '../components/Logo';

// Reuse your existing jet assets
import falcon from '../assets/jets/Falcon.png';
import skyLiner200 from '../assets/jets/SkyLiner200.png';
import horizon700 from '../assets/jets/Horizon700.png';
import aeroSwift from '../assets/jets/AeroSwift.png';
import cloudCruiser from '../assets/jets/CloudCruiser.png';

// Reusable slice section: image + text; `reverse` flips layout (like your reference site)
function Slice({ title, subtitle, copy, img, reverse = false }) {
  return (
    <section className={`slice ${reverse ? 'reverse' : ''}`}>
      <div className="slice-media">
        <img src={img} alt={title} />
      </div>
      <div className="slice-text">
        <h3 className="slice-title">{title}</h3>
        {subtitle && <p className="slice-subtitle">{subtitle}</p>}
        <p className="slice-copy">{copy}</p>
        <button className="linklike" type="button">
          Learn More <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}

function AboutPage({ onBackToStore }) {
  return (
    <div className="aboutV2">
      <Logo />

      {/* HERO: large image with overlayed headline and copy */}
      <header className="hero">
        <img src={horizon700} alt="Discover our Fleet" className="hero-img" />
        <div className="hero-overlay">
          <h1>Discover our Fleet</h1>
          <p>
            Your journey is our promise. With a curated fleet and end-to-end guidance, we get you
            where you want to go — exactly how you want to get there.
          </p>
          <button className="linklike light" type="button">
            Learn More <span aria-hidden>→</span>
          </button>
        </div>
      </header>

      {/* Demo side index — use buttons instead of <a> without href for accessibility */}
      <aside className="side-index" aria-hidden="true">
        <button type="button" className="linklike">Aircraft Management</button>
        <button type="button" className="linklike">Aircraft Sales</button>
        <button type="button" className="linklike">Charter</button>
        <button type="button" className="linklike">Completions</button>
        <button type="button" className="linklike">Government Programs</button>
        <button type="button" className="linklike">FBO</button>
        <button type="button" className="linklike">Maintenance</button>
        <button type="button" className="linklike">Staffing</button>
      </aside>

      {/* Alternating content slices (image left/right) */}
      <main className="content">
        <Slice
          title="Aircraft Management"
          subtitle="Enjoy ownership. We handle the rest."
          copy="Tailored programs for scheduling, crew, insurance, hangar, and maintenance oversight. Transparent reporting and proactive planning keep your aircraft mission-ready."
          img={falcon}
        />

        <Slice
          title="Aircraft Sales"
          subtitle="Acquisition & resale with confidence."
          copy="From mission analysis and pre-buy inspection to escrow, registration, and delivery. We negotiate on your behalf and protect your total cost of ownership."
          img={aeroSwift}
          reverse
        />

        <Slice
          title="Charter"
          subtitle="Go where you want. Seamlessly."
          copy="On-demand access to premium aircraft with global coverage. Discreet handling, optimized routing, and the highest safety standards."
          img={cloudCruiser}
        />

        <Slice
          title="FBO & Global Support"
          subtitle="From touch-down to take-off — we’re there."
          copy="A vetted partner network for ground services, fueling, concierge, and turnarounds. Travel should feel effortless; our team makes it so."
          img={skyLiner200}
          reverse
        />
      </main>

      {/* Wide CTA echoing the premium tone */}
      <section className="cta-wide">
        <h2>Our Services</h2>
        <p>
          Behind every flawless departure are thousands of meticulous actions. Our end-to-end service
          model is designed so that your experience feels simple — because we handle the complexity.
        </p>
      </section>

      <div className="footer-actions">
        <button className="back-btn" onClick={onBackToStore} type="button">← Back to Store</button>
      </div>
    </div>
  );
}

export default AboutPage;
