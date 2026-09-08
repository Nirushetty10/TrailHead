import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

export default function CTASection() {
  return (
    <section className="section cta" id="get-started">
      <div className="cta__glow" aria-hidden="true" />
      <div className="container cta__inner">
        <Reveal>
          <h2>Ready to put AI to work for your business?</h2>
          <p>Connect your store and discover what TRAILHEAD could do for your business.</p>
        </Reveal>
        <Reveal delay={0.1} className="cta__actions">
          <a href="#get-started" className="btn btn--onDark">
            Get Started <ArrowRight size={16} />
          </a>
          <a href="#demo" className="btn btn--ghost cta__ghost">Book a Demo</a>
        </Reveal>
      </div>
    </section>
  );
}
