import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const levels = ['Manual', 'Assisted', 'Automatic', 'Controlled Autonomy'];

const rules = [
  { range: 'Refund < \u20b91,000', status: 'Automatic', tone: 'auto' },
  { range: '\u20b91,000\u2013\u20b95,000', status: 'Approval Required', tone: 'review' },
  { range: '> \u20b95,000', status: 'Restricted', tone: 'restricted' },
];

export default function HumanControl() {
  return (
    <section className="section section--alt">
      <div className="container control">
        <SectionHeader
          eyebrow="Human Control"
          title="Powerful AI. Your business, your rules."
          body="Merchants stay in control. Every important action can be governed by permissions, approvals and business rules."
        />

        <div className="control__layout">
          <Reveal className="control__levels">
            {levels.map((l, i) => (
              <div key={l} className="control__level">
                <span className="control__level-dot" />
                <span>{l}</span>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.15} className="control__rules card">
            <span className="dash__block-title">Example: refund permissions</span>
            <ul>
              {rules.map((r) => (
                <li key={r.range}>
                  <span>{r.range}</span>
                  <span className={`control__status control__status--${r.tone}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
