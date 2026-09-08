import Reveal from './Reveal';

export default function SectionHeader({ eyebrow, title, body, center = false }) {
  return (
    <Reveal className={`section-head ${center ? 'section-head--center' : ''}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </Reveal>
  );
}
