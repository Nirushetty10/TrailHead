import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const metrics = [
  ['Revenue', '\u20b91,24,000'],
  ['Orders', '842'],
  ['Conversion', '8.4%'],
  ['AOV', '\u20b91,482'],
  ['AI-assisted Revenue', '\u20b928,400'],
  ['Customer Growth', '+12%'],
  ['Support Resolution', '94%'],
  ['AI Health Score', '87 / 100'],
];

const questions = [
  'Why did sales drop?',
  'Which products need attention?',
  'Which customers are likely to buy again?',
  'Where are we losing customers?',
  'What should we prioritize?',
];

const bars = [40, 55, 48, 66, 60, 74, 70, 84, 78, 92, 88, 96];

function Chart() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <div className="bi-chart" ref={ref} aria-hidden="true">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="bi-chart__bar"
          initial={{ height: 0 }}
          animate={inView ? { height: `${h}%` } : {}}
          transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

export default function BusinessIntelligence() {
  return (
    <section className="section section--alt" id="intelligence">
      <div className="container bi">
        <SectionHeader
          eyebrow="Business Intelligence"
          title="Know what\u2019s happening in your business."
          body="TRAILHEAD reads your revenue, orders, conversations and support data as one connected picture, not a pile of separate reports."
        />

        <div className="bi__layout">
          <Reveal className="card bi__dashboard">
            <div className="bi__dashboard-head">
              <span>This month</span>
              <Chart />
            </div>
            <div className="bi__grid">
              {metrics.map(([label, value]) => (
                <div key={label} className="bi__stat">
                  <span className="dash__label">{label}</span>
                  <span className="dash__value">{value}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="bi__questions">
            <p className="bi__questions-lead">Ask it what your dashboards can\u2019t tell you.</p>
            <ul>
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="bi__closer">
          <p>TRAILHEAD turns your business data into decisions.</p>
        </Reveal>
      </div>
    </section>
  );
}
