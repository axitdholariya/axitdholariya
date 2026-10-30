export interface CardType {
  id: string
  name: string
  /** How many sides the PDF normally contains. */
  sides: 1 | 2
  passwordHint?: string
}

export const CARD_TYPES: CardType[] = [
  {
    id: 'aadhaar',
    name: 'Aadhaar (e-Aadhaar)',
    sides: 2,
    passwordHint: 'Naam ke pehle 4 akshar CAPITAL mein + janam ka saal (jaise RAVI1995)',
  },
  { id: 'pan', name: 'PAN (NSDL / UTI / e-Filing)', sides: 2, passwordHint: 'Janam tithi DDMMYYYY (jaise 01011995)' },
  { id: 'voter', name: 'Voter ID (e-EPIC)', sides: 2 },
  { id: 'ayushman', name: 'Ayushman / ABHA', sides: 2 },
  { id: 'other', name: 'Koi aur ID card', sides: 2 },
]
