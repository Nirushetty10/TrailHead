import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import DashboardMockup from './DashboardMockup';
import NetworkGraph from './NetworkGraph';

const easing = [0.22, 1, 0.36, 1];

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__inner">
        <div className="hero__copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            AI Employees for E-commerce
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: easing }}
          >
            The AI operating system for e-commerce
          </motion.h1>

          <motion.p
            className="hero__sub"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: easing }}
          >
            TRAILHEAD helps your business understand customers, increase sales,
            automate operations, and continuously find new opportunities to grow.
          </motion.p>

          <motion.div
            className="hero__cta"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: easing }}
          >
            <a href="#get-started" className="btn btn--primary">
              Get Started <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className="btn btn--ghost">
              <PlayCircle size={16} /> See How It Works
            </a>
          </motion.div>

          <motion.p
            className="hero__trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            Built for modern e-commerce businesses.
          </motion.p>
        </div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: easing }}
        >
          <div className="hero__graph">
            <NetworkGraph />
          </div>
          <div className="hero__dash">
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
