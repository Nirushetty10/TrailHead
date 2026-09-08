import { useState } from 'react';
import { ShoppingBag, Headphones, Repeat2, LineChart, Cog, Check } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { employees } from '../data/content';

const icons = { sales: ShoppingBag, support: Headphones, retention: Repeat2, analytics: LineChart, operations: Cog };

export default function AIEmployees() {
  const [active, setActive] = useState('sales');
  const current = employees.find((e) => e.key === active);
  const Icon = icons[current.key];

  return (
    <section className="section" id="ai-employees">
      <div className="container">
        <SectionHeader
          eyebrow="AI Employees"
          title="Your AI team never clocks out."
          body="Five specialized AI Employees, each focused on a different part of the business, working from one shared understanding of your store."
        />

        <div className="employees">
          <div className="employees__tabs" role="tablist" aria-label="AI Employees">
            {employees.map((e) => {
              const TabIcon = icons[e.key];
              return (
                <button
                  key={e.key}
                  role="tab"
                  aria-selected={active === e.key}
                  className={`employees__tab ${active === e.key ? 'employees__tab--active' : ''}`}
                  onClick={() => setActive(e.key)}
                >
                  <TabIcon size={17} strokeWidth={1.75} />
                  {e.name}
                </button>
              );
            })}
          </div>

          <Reveal key={active} className="employees__panel card">
            <div className="employees__panel-icon">
              <Icon size={22} strokeWidth={1.75} />
            </div>
            <h3>{current.name}</h3>
            <p className="employees__panel-body">{current.body}</p>
            <ul className="employees__capabilities">
              {current.capabilities.map((c) => (
                <li key={c}><Check size={14} /> {c}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
