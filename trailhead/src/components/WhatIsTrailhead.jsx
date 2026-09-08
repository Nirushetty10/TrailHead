import { Search, ShoppingBag, MessageCircle, RotateCcw, Compass, Workflow, BarChart3, Sparkles } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

const capabilities = [
  { icon: Search, label: 'Understand customers' },
  { icon: ShoppingBag, label: 'Sell products' },
  { icon: MessageCircle, label: 'Answer questions' },
  { icon: RotateCcw, label: 'Recover lost sales' },
  { icon: Compass, label: 'Retain customers' },
  { icon: Sparkles, label: 'Discover opportunities' },
  { icon: Workflow, label: 'Automate repetitive work' },
  { icon: BarChart3, label: 'Make better decisions' },
];

export default function WhatIsTrailhead() {
  return (
    <section className="section section--alt" id="platform">
      <div className="container what-is">
        <SectionHeader
          eyebrow="What is TRAILHEAD"
          title="Meet your AI team for e-commerce."
          body="TRAILHEAD is not just a chatbot. It's an intelligent platform built around a single understanding of your business — one that grows sharper the longer it runs your store."
        />

        <div className="capability-grid">
          {capabilities.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.04} className="capability">
              <c.icon size={18} strokeWidth={1.75} />
              <span>{c.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
