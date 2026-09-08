import { ShoppingCart, MessageSquareText, Lightbulb, Clock, Repeat } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { problems } from '../data/content';

const icons = [ShoppingCart, MessageSquareText, Lightbulb, Clock, Repeat];

export default function ProblemSection() {
  return (
    <section className="section" id="problem">
      <div className="container">
        <SectionHeader
          eyebrow="The problem"
          title="Running an online store shouldn\u2019t mean doing everything yourself."
          body="Growing e-commerce businesses hit the same wall: more customers, more questions, more data — and no extra hours in the day."
        />

        <div className="problem-grid">
          {problems.map((p, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={p.title} delay={i * 0.06} className="problem-card card">
                <Icon size={20} strokeWidth={1.75} />
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.3} className="problem-resolve">
          <p>TRAILHEAD turns these challenges into opportunities.</p>
        </Reveal>
      </div>
    </section>
  );
}
