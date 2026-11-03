/** Expand scientific notation without rounding the number's stored representation. */
export function decimalText(value: number): string {
  const text = String(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i.exec(text);
  if (!match) return text;
  const [, sign, whole, fraction = "", exponent] = match;
  const digits = whole + fraction;
  const position = whole.length + Number(exponent);
  if (position <= 0) return `${sign}0.${"0".repeat(-position)}${digits}`;
  if (position >= digits.length) return `${sign}${digits}${"0".repeat(position - digits.length)}`;
  return `${sign}${digits.slice(0, position)}.${digits.slice(position)}`;
}

export function isRepresentableDecimalInput(text: string): boolean {
  const normalize = (input: string) => {
    const [integer = "", fraction = ""] = input.replace(",", ".").split(".");
    return `${integer.replace(/^0+/, "") || "0"}.${fraction.replace(/0+$/, "")}`;
  };
  if (!/^\d*[.,]?\d*$/.test(text) || text.length > 350) return false;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && normalize(text) === normalize(decimalText(value));
}

/** Move the decimal point using text, without rounding during unit conversion. */
export function shiftDecimalInput(text: string, places: number): string | null {
  if (!/^\d*[.,]?\d*$/.test(text) || text.length > 350 || !Number.isInteger(places) || Math.abs(places) > 6) return null;
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  const digits = (whole || "0") + fraction;
  const position = (whole || "0").length + places;
  let shifted: string;
  if (position <= 0) shifted = `0.${"0".repeat(-position)}${digits}`;
  else if (position >= digits.length) shifted = `${digits}${"0".repeat(position - digits.length)}`;
  else shifted = `${digits.slice(0, position)}.${digits.slice(position)}`;
  const [shiftedWhole, shiftedFraction] = shifted.split(".");
  const integer = shiftedWhole.replace(/^0+(?=\d)/, "");
  const decimal = shiftedFraction?.replace(/0+$/, "");
  return decimal ? `${integer}.${decimal}` : integer;
}
