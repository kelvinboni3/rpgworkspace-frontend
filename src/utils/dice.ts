const NOTATION_PATTERN = /^(\d{1,2})?d(\d{1,4})([+-]\d{1,3})?$/i;
const MAX_DICE = 20;
const MAX_SIDES = 1000;

export type DiceRoll = {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
};

/** Parses "d20", "2d6", "1d8+3", "3d4-1" — count defaults to 1, no spaces. */
export function parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } | null {
  const match = NOTATION_PATTERN.exec(notation.trim());
  if (!match) return null;

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (count < 1 || count > MAX_DICE || sides < 2 || sides > MAX_SIDES) return null;

  return { count, sides, modifier };
}

export function rollDice(notation: string): DiceRoll | null {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;

  const { count, sides, modifier } = parsed;
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return { notation: normalizeNotation(count, sides, modifier), rolls, modifier, total };
}

function normalizeNotation(count: number, sides: number, modifier: number) {
  const die = count === 1 ? `d${sides}` : `${count}d${sides}`;
  if (modifier === 0) return die;
  return modifier > 0 ? `${die}+${modifier}` : `${die}${modifier}`;
}
