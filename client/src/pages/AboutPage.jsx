// src/pages/AboutPage.jsx
// Premium “About” page with alternating image/text slices + hero.
// - Uses anchors + <nav> for real in-page navigation
// - Matches your CSS scope (.aboutV2) and reverse alias (.slice--reverse)
// - Memoized Slice for perf, PropTypes for safety

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import './AboutPage.css';
import Logo from '../components/Logo';

// Fleet assets
import falcon from '../assets/jets/Falcon.png';
import skyLiner200 from '../assets/jets/SkyLiner200.png';
import horizon700 from '../assets/jets/Horizon700.png';
import aeroSwift from '../assets/jets/AeroSwift.png';
import cloudCruiser from '../assets/jets/CloudCruiser.png';

/** Reusable image+text section.
 *  reverse → flips the media/text columns (handled by CSS via .slice--reverse)
 */
const Slice = memo(function Slice({
  id,
  title,
  subtitle,
  copy,
  img,
  alt,
  reverse = false,
  ctaLabel = 'Learn More',
  ctaHref = '#',
}) {
  return (
    <section id={id} className={`slice ${reverse ? 'slice--reverse' : ''}`} aria-labelledby={`${id}-title`}>
      <div className="slice-media">
        <img src={img} alt={alt || title} loading="lazy" />
      </div>

      <div className="slice-text">
        <h3 id={`${id}-title`} className="slice-title">{title}</h3>
        {subtitle && <p className="slice-subtitle">{subtitle}</p>}
        {copy && <p className="slice-copy">{copy}</p>}
        <a className="linklike" href={ctaHref}>
          {ctaLabel} <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
});

Slice.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  copy: PropTypes.string,
  img: PropTypes.string.isRequired,
  alt: PropTypes.string,
  reverse: PropTypes.bool,
  ctaLabel: PropTypes.string,
  ctaHref: PropTypes.string,
};

function AboutPage({ onBackToStore }) {
  // Side index items (nav ↔ slice ids)
  const sections = [
    { id: 'mgmt', label: 'Aircraft Management' },
    { id: 'sales', label: 'Aircraft Sales' },
    { id: 'charter', label: 'Charter' },
    { id: 'fbo', label: 'FBO & Global Support' },
  ];

  return (
    <div className="aboutV2">
      <Logo />

      {/* HERO: large image with overlayed headline and copy */}
      <header className="hero">
        <img
          src={horizon700}
          alt="Discover our Fleet"
          className="hero-img"
        />
        <div className="hero-overlay">
          <h1>Discover our Fleet</h1>
          <p>
            Your journey is our promise. With a curated fleet and end-to-end guidance,
            we get you where you want to go — exactly how you want to get there.
          </p>
          <a className="linklike light" href={`#${sections[0].id}`}>
            Learn More <span aria-hidden>→</span>
          </a>
        </div>
      </header>

      {/* Side index (visible on xl via CSS) */}
      <nav className="side-index" aria-label="About page sections">
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`} className="linklike">{s.label}</a>
        ))}
      </nav>

      {/* Alternating content slices */}
      <main className="content">
        <Slice
          id="mgmt"
          title="Aircraft Management"
          subtitle="Enjoy ownership. We handle the rest."
          copy="Tailored programs for scheduling, crew, insurance, hangar, and maintenance oversight. Transparent reporting and proactive planning keep your aircraft mission-ready."
          img={falcon}
          alt="Falcon jet on the tarmac at sunset"
        />

        <Slice
          id="sales"
          title="Aircraft Sales"
          subtitle="Acquisition & resale with confidence."
          copy="From mission analysis and pre-buy inspection to escrow, registration, and delivery. We negotiate on your behalf and protect your total cost of ownership."
          img={aeroSwift}
          alt="AeroSwift jet in hangar"
          reverse
        />

        <Slice
          id="charter"
          title="Charter"
          subtitle="Go where you want. Seamlessly."
          copy="On-demand access to premium aircraft with global coverage. Discreet handling, optimized routing, and the highest safety standards."
          img={cloudCruiser}
          alt="CloudCruiser jet cruising above clouds"
        />

        <Slice
          id="fbo"
          title="FBO & Global Support"
          subtitle="From touch-down to take-off — we’re there."
          copy="A vetted partner network for ground services, fueling, concierge, and turnarounds. Travel should feel effortless; our team makes it so."
          img={skyLiner200}
          alt="SkyLiner200 jet at an FBO stand"
          reverse
        />
      </main>

      {/* Wide CTA */}
      <section className="cta-wide" aria-labelledby="services-title">
        <h2 id="services-title">Our Services</h2>
        <p>
          Behind every flawless departure are thousands of meticulous actions. Our end-to-end service
          model is designed so that your experience feels simple — because we handle the complexity.
        </p>
      </section>

      <div className="footer-actions">
        <button className="back-btn" onClick={onBackToStore} type="button" aria-label="Back to Store">
          ← Back to Store
        </button>
      </div>
    </div>
  );
}

AboutPage.propTypes = {
  onBackToStore: PropTypes.func, // optional
};

export default AboutPage;
