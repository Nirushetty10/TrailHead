import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const before = ['Customer Support', 'Sales', 'Analytics', 'Retention', 'Operations'];
const after = [
  { group: 'Sales', below: 'Analytics' },
  { group: 'Support', below: 'Operations' },
  { group: 'Retention', below: 'Growth' },
];

export default function ForSmallBusinesses() {
  return (
    <section className="section">
      <div className="container smallbiz">
        <SectionHeader
          eyebrow="For small and growing businesses"
          title="Enterprise-level intelligence. Without an enterprise-sized team."
          body="A small e-commerce business normally can\u2019t afford a sales team, a support team, a data analyst, a retention specialist, an operations team and a growth specialist. TRAILHEAD gives them AI-powered capabilities across all of these areas."
        />

        <div className="smallbiz__compare">
          <Reveal className="smallbiz__panel card">
            <span className="dash__block-title">Before</span>
            <div className="smallbiz__owner">Owner</div>
            <ul className="smallbiz__before-list">
              {before.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </Reveal>

          <Reveal delay={0.15} className="smallbiz__panel card">
            <span className="dash__block-title">With TRAILHEAD</span>
            <div className="smallbiz__owner">Owner</div>
            <div className="smallbiz__arrow-down" aria-hidden="true" />
            <div className="smallbiz__core">TRAILHEAD</div>
            <div className="smallbiz__after-grid">
              {after.map((a) => (
                <div key={a.group} className="smallbiz__after-col">
                  <span>{a.group}</span>
                  <span className="smallbiz__after-sub">{a.below}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.25} className="smallbiz__statement">
          <p>You run the business. TRAILHEAD helps run the digital side of the business.</p>
        </Reveal>
      </div>
    </section>
  );
}
