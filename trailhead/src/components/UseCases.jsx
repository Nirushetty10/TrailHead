import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { useCases } from '../data/content';

export default function UseCases() {
  return (
    <section className="section section--alt" id="use-cases">
      <div className="container">
        <SectionHeader
          eyebrow="Use cases"
          title="Wherever growth is stuck, TRAILHEAD can help."
        />

        <div className="usecase-grid">
          {useCases.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.04} className="usecase-card">
              <h3>{u.title}</h3>
              <p>{u.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
