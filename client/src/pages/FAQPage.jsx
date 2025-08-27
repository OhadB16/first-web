// src/pages/FAQPage.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './FAQPage.css';
import Logo from '../components/Logo';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

function FAQPage({ onBackToStore }) {
  const faqs = useMemo(() => ([
    {
      q: 'How do you support an aircraft acquisition?',
      a: 'From market scanning and pre-buy due diligence through escrow, registration, and delivery. We lead the full transaction with discretion and data-driven advice.',
    },
    {
      q: 'Do you help after the purchase?',
      a: 'Yes. We assist with MRO planning, crew recruitment, training, and ongoing operating cost optimization.',
    },
    {
      q: 'Can you source off-market aircraft?',
      a: 'Frequently. Our network often surfaces aircraft not publicly listed.',
    },
    {
      q: 'Do you accept trade-ins?',
      a: 'Case by case. We can also coordinate sale of your current airframe while acquiring the next.',
    },
    {
      q: 'What about financing and insurance?',
      a: 'We coordinate reputable lenders and insurers, aligning terms with your operating profile.',
    },
  ]), []);

  const faqsWithIds = useMemo(
    () => faqs.map(f => ({ ...f, id: slugify(f.q) })),
    [faqs]
  );

  // SEO: FAQPage structured data
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqsWithIds.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }), [faqsWithIds]);

  return (
    <div className="faq-container">
      <Logo />

      <h1 className="faq-title">Frequently Asked Questions</h1>
      <p className="faq-subtitle">
        Clear answers about our advisory, acquisition, and long-term ownership support.
      </p>

      <div className="faq-list">
        {faqsWithIds.map(({ id, q, a }) => (
          <details key={id} id={id} className="faq-item">
            <summary id={`${id}-summary`}>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      <div className="faq-cta">
        <button className="btn-outline" type="button" onClick={onBackToStore}>
          ← Back to Store
        </button>
      </div>

      {/* Structured data for search engines */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

FAQPage.propTypes = {
  onBackToStore: PropTypes.func, // optional callback to navigate back
};

export default FAQPage;
