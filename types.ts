export interface Message {
  role: 'user' | 'model';
  text: string;
}

export enum TechniqueType {
  NEUTRAL = 'Infinity (Neutral)',
  BLUE = 'Cursed Technique Lapse: Blue',
  RED = 'Cursed Technique Reversal: Red',
  PURPLE = 'Hollow Technique: Purple'
}

export interface ParticleState {
  id: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  color: string;
  active: boolean;
}