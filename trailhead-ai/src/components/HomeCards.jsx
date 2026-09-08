import './HomeCards.css';

export default function HomeCards({ cards, businessName, onSelectCard }) {
  return (
    <div className="home-cards">
      <div className="home-cards__brand">{(businessName || 'ASSISTANT').toUpperCase()}</div>
      <h1 className="home-cards__greeting">What do you need help with?</h1>

      <div className="home-cards__grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              className="home-card"
              onClick={() => onSelectCard(card)}
              type="button"
            >
              <Icon
                className="home-card__icon"
                sx={{
                  color: card.accent === 'signal' ? 'var(--signal)' : 'var(--accent)',
                  fontSize: 26,
                }}
              />
              <div className="home-card__title">{card.title}</div>
              <div className="home-card__desc">{card.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
