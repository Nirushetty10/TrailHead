import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const loop = ['Observe', 'Understand', 'Find Opportunity', 'Prioritize', 'Recommend', 'Act', 'Experiment', 'Measure', 'Learn'];

export default function AutonomousGrowth() {
  return (
    <section className="section">
      <div className="container">
        <SectionHeader
          eyebrow="Autonomous Growth"
          title="From insights to action."
          body="TRAILHEAD doesn\u2019t just tell you what is happening. It helps you decide what to do next."
        />

        <Reveal delay={0.1} className="loop">
          {loop.map((step, i) => (
            <div key={step} className="loop__step">
              <span className="loop__index">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
