import { useState } from 'react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const scenarios = [
  {
    label: 'Increase Product A price by 10%',
    results: [
      ['Expected Revenue', '+8.2%'],
      ['Expected Orders', '\u22123.1%'],
      ['Expected AOV', '+9.7%'],
    ],
    confidence: 'Medium',
  },
  {
    label: 'Create Coffee + Honey bundle',
    results: [
      ['Expected AOV', '+12%'],
      ['Expected Conversion', '+4.8%'],
    ],
    confidence: 'Medium',
  },
];

export default function WhatIfSimulation() {
  const [active, setActive] = useState(0);
  const scenario = scenarios[active];

  return (
    <section className="section section--alt">
      <div className="container">
        <SectionHeader
          eyebrow="What-If Simulation"
          title='Ask "what if?" before making a decision.'
          body="Model the outcome of a pricing change, a bundle, or a promotion before you commit to it."
        />

        <Reveal className="sim card">
          <div className="sim__tabs">
            {scenarios.map((s, i) => (
              <button
                key={s.label}
                className={`sim__tab ${active === i ? 'sim__tab--active' : ''}`}
                onClick={() => setActive(i)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="sim__body">
            <span className="eyebrow">What if?</span>
            <p className="sim__scenario">{scenario.label}</p>
            <div className="sim__results">
              {scenario.results.map(([label, value]) => (
                <div key={label} className="sim__result">
                  <span className="dash__label">{label}</span>
                  <span className={`sim__result-value ${value.startsWith('-') || value.startsWith('\u2212') ? 'sim__result-value--down' : ''}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <span className="pill">Confidence: {scenario.confidence}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
