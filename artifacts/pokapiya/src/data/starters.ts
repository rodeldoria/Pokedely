export interface Starter {
  id: number;
  name: string;
  type: string;
  color: string;
  description: string;
}

export const STARTERS: Starter[] = [
  { id: 133, name: 'Eevee',    type: 'normal',   color: '#c8a279', description: 'Friendly and adaptable! Can grow up to be lots of things!' },
  { id: 134, name: 'Vaporeon', type: 'water',    color: '#6890f0', description: 'Splashy and cool! Loves the water!' },
  { id: 135, name: 'Jolteon',  type: 'electric', color: '#f8d030', description: 'Sparkly and super fast! Zap zap!' },
  { id: 136, name: 'Flareon',  type: 'fire',     color: '#f08030', description: 'Warm and fluffy! Snuggle-friend!' },
  { id: 196, name: 'Espeon',   type: 'psychic',  color: '#f85888', description: 'Smart and shiny! Can read your mind!' },
  { id: 197, name: 'Umbreon',  type: 'dark',     color: '#705848', description: 'Mysterious moonlight friend! Glows in the dark!' },
  { id: 470, name: 'Leafeon',  type: 'grass',    color: '#78c850', description: 'Leafy and gentle! Smells like fresh grass!' },
  { id: 471, name: 'Glaceon',  type: 'ice',      color: '#98d8d8', description: 'Cool and icy! A frosty friend!' },
  { id: 700, name: 'Sylveon',  type: 'fairy',    color: '#ee99ac', description: 'Cuddly and magical! Loves bows!' },
];
