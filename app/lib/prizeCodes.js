export const PRIZE_CODES = {
  Tomate_Mozzarella: "A1",
  Tiramisù: "M9",
  Pizzetta_Dop: "V9",
  Rigatoni_Bolognaise: "B8",
};

export function getPrizeCode(prizeId) {
  return PRIZE_CODES[prizeId] || null;
}
