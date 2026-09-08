import Reveal from './Reveal';

const stages = [
  'Chatbot',
  'AI Sales & Support',
  'AI Employees',
  'Business Intelligence',
  'Predictive Intelligence',
  'Autonomous Growth',
  'AI Business Manager',
];

export default function ChatbotToBusiness() {
  return (
    <section className="section section--dark">
      <div className="container">
        <Reveal className="progression-head">
          <p className="eyebrow" style={{ color: '#B9B2FF' }}>Beyond the chatbot</p>
          <h2 className="progression-statement">
            TRAILHEAD understands the business behind every conversation.
          </h2>
        </Reveal>

        <div className="progression">
          {stages.map((s, i) => (
            <Reveal key={s} delay={i * 0.07} className="progression__stage">
              <span className="progression__dot" />
              <span>{s}</span>
              {i < stages.length - 1 && <span className="progression__connector" aria-hidden="true" />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
