import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { TrendingUp, Circle } from 'lucide-react';

function useCountUp(target, inView, decimals = 0, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = null;
    let raf;
    const step = (t) => {
      if (start === null) start = t;
      const progress = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return value.toFixed(decimals);
}

export default function DashboardMockup() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const revenue = useCountUp(124000, inView);
  const aiRevenue = useCountUp(28400, inView);
  const conv = useCountUp(8.4, inView, 1);
  const aov = useCountUp(1482, inView);

  return (
    <div className="dash" ref={ref}>
      <div className="dash__header">
        <span>Business Health</span>
        <span className="dash__live">
          <Circle size={7} fill="#2F7A5C" stroke="none" /> Live
        </span>
      </div>

      <div className="dash__metrics">
        <div className="dash__metric">
          <span className="dash__label">Revenue</span>
          <span className="dash__value">₹{Number(revenue).toLocaleString('en-IN')}</span>
        </div>
        <div className="dash__metric">
          <span className="dash__label">AI-assisted Revenue</span>
          <span className="dash__value">₹{Number(aiRevenue).toLocaleString('en-IN')}</span>
        </div>
        <div className="dash__metric">
          <span className="dash__label">Conversion</span>
          <span className="dash__value">{conv}%</span>
        </div>
        <div className="dash__metric">
          <span className="dash__label">AOV</span>
          <span className="dash__value">₹{aov}</span>
        </div>
      </div>

      <div className="dash__divider" />

      <div className="dash__block">
        <span className="dash__block-title">AI Employees</span>
        <div className="dash__employees">
          {['Sales', 'Support', 'Retention', 'Analytics'].map((e, i) => (
            <motion.span
              key={e}
              className="dash__employee"
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
            >
              <Circle size={7} fill="#4B3CF0" stroke="none" /> {e}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="dash__divider" />

      <div className="dash__block">
        <span className="dash__block-title">Opportunities</span>
        <div className="dash__opps">
          {[
            { title: 'Product A', body: 'High conversion opportunity' },
            { title: 'Customer Segment', body: 'High repeat-purchase potential' },
            { title: 'Cart Recovery', body: '₹18,400 potential revenue' },
          ].map((o, i) => (
            <motion.div
              className="dash__opp"
              key={o.title}
              initial={{ opacity: 0, x: 10 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.8 + i * 0.12, duration: 0.4 }}
            >
              <TrendingUp size={14} />
              <div>
                <p className="dash__opp-title">{o.title}</p>
                <p className="dash__opp-body">{o.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
