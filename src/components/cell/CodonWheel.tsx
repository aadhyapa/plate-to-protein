import { ALL_CODONS, AMINO_ACIDS, RNA_BASES, STOP, codonToLetter } from '../../lib/genetics';

const R = [0, 34, 68, 100, 140]; // ring boundaries: 1st base, 2nd base, 3rd base, amino acid

function point(radius: number, degrees: number): [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180; // 0° at the top, clockwise
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
}

/** A ring segment between two radii and two angles. */
function sector(inner: number, outer: number, from: number, to: number): string {
  const [x1, y1] = point(outer, from);
  const [x2, y2] = point(outer, to);
  const [x3, y3] = point(inner, to);
  const [x4, y4] = point(inner, from);
  const large = to - from > 180 ? 1 : 0;
  const f = (value: number) => value.toFixed(2);
  if (inner === 0) return `M0 0 L${f(x1)} ${f(y1)} A${outer} ${outer} 0 ${large} 1 ${f(x2)} ${f(y2)} Z`;
  return `M${f(x1)} ${f(y1)} A${outer} ${outer} 0 ${large} 1 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A${inner} ${inner} 0 ${large} 0 ${f(x4)} ${f(y4)} Z`;
}

/** Runs of neighbouring codons that code for the same amino acid share one outer label. */
const OUTER_GROUPS: { letter: string; from: number; to: number; codons: string[] }[] = [];
ALL_CODONS.forEach(({ codon, letter }, index) => {
  const last = OUTER_GROUPS[OUTER_GROUPS.length - 1];
  // Don't merge across a change of first or second base, so groups line up with the rings.
  if (last && last.letter === letter && index % 4 !== 0) {
    last.to = index + 1;
    last.codons.push(codon);
  } else {
    OUTER_GROUPS.push({ letter, from: index, to: index + 1, codons: [codon] });
  }
});

interface CodonWheelProps {
  /** The codon to highlight, e.g. "GAG", or null. */
  active: string | null;
  onSelect: (codon: string) => void;
}

/**
 * The genetic code as a wheel: read from the centre outwards (first, second, third base)
 * to find the amino acid on the rim. Clicking a third-base segment selects that codon.
 * The drop-downs next to the wheel do the same thing for keyboard and screen-reader users.
 */
export default function CodonWheel({ active, onSelect }: CodonWheelProps) {
  const activeIndex = active ? ALL_CODONS.findIndex((item) => item.codon === active) : -1;

  return (
    <svg className="wheel" viewBox="-146 -146 292 292" aria-hidden="true">
      {/* First base */}
      {RNA_BASES.map((base, i) => {
        const on = activeIndex >= 0 && Math.floor(activeIndex / 16) === i;
        const [x, y] = point(20, i * 90 + 45);
        return (
          <g key={base} className={`wheel__cell${on ? ' is-active' : ''}`}>
            <path d={sector(R[0], R[1], i * 90, (i + 1) * 90)} />
            <text x={x} y={y} className="wheel__base wheel__base--1">{base}</text>
          </g>
        );
      })}
      {/* Second base */}
      {Array.from({ length: 16 }, (_, i) => {
        const on = activeIndex >= 0 && Math.floor(activeIndex / 4) === i;
        const [x, y] = point(51, i * 22.5 + 11.25);
        return (
          <g key={i} className={`wheel__cell${on ? ' is-active' : ''}`}>
            <path d={sector(R[1], R[2], i * 22.5, (i + 1) * 22.5)} />
            <text x={x} y={y} className="wheel__base wheel__base--2">{RNA_BASES[i % 4]}</text>
          </g>
        );
      })}
      {/* Third base: these are the clickable codons */}
      {ALL_CODONS.map(({ codon }, i) => {
        const [x, y] = point(84, i * 5.625 + 2.8125);
        return (
          <g
            key={codon}
            className={`wheel__cell wheel__cell--codon${activeIndex === i ? ' is-active' : ''}`}
            onClick={() => onSelect(codon)}
          >
            <path d={sector(R[2], R[3], i * 5.625, (i + 1) * 5.625)} />
            <text x={x} y={y} className="wheel__base wheel__base--3">{codon[2]}</text>
          </g>
        );
      })}
      {/* Amino acids */}
      {OUTER_GROUPS.map((group) => {
        const from = group.from * 5.625;
        const to = group.to * 5.625;
        const middle = (from + to) / 2;
        const [x, y] = point(120, middle);
        const on = active !== null && group.codons.includes(active);
        const isStop = group.letter === STOP;
        // Text runs along the radius; flip it on the left half so it is never upside down.
        const rotation = middle > 180 ? middle + 90 : middle - 90;
        return (
          <g
            key={group.codons[0]}
            className={`wheel__cell wheel__cell--amino${on ? ' is-active' : ''}${isStop ? ' is-stop' : ''}`}
            onClick={() => onSelect(group.codons[0])}
          >
            <path d={sector(R[3], R[4], from, to)} />
            <text x={x} y={y} transform={`rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`} className="wheel__amino">
              {isStop ? 'Stop' : AMINO_ACIDS[group.letter].short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Plain-language result for a codon, used beside the wheel. */
export function describeCodon(codon: string): string {
  const letter = codonToLetter(codon);
  if (letter === undefined) return '';
  if (letter === STOP) return `${codon} is a stop codon: it ends the protein.`;
  const info = AMINO_ACIDS[letter];
  const count = ALL_CODONS.filter((item) => item.letter === letter).length;
  return `${codon} codes for ${info.name.toLowerCase()} (${info.short}). ${
    count === 1 ? 'It is the only codon for it.' : `${count} different codons code for it.`
  }${info.essential ? ' It is an essential amino acid.' : ''}${codon === 'AUG' ? ' AUG is also the start codon.' : ''}`;
}
