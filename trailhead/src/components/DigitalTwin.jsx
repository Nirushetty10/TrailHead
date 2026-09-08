import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const nodes = ['Customers', 'Products', 'Orders', 'Conversations', 'Revenue', 'Support', 'AI Employees'];

export default function DigitalTwin() {
  return (
    <section className="section section--alt">
      <div className="container twin">
        <SectionHeader
          eyebrow="One connected model"
          title="TRAILHEAD sees the bigger picture."
          body="Instead of analyzing isolated data, TRAILHEAD understands how customers, products, conversations and revenue are connected."
        />

        <Reveal delay={0.1} className="twin__chain">
          {nodes.map((n, i) => (
            <div key={n} className="twin__node-wrap">
              <div className="twin__node">{n}</div>
              {i < nodes.length - 1 && <span className="twin__link" aria-hidden="true">\u2195</span>}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
