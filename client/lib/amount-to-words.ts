const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertTwoDigits(n: number): string {
  if (n < 20) return ones[n] ?? "";
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return (tens[ten] ?? "") + (one > 0 ? " " + ones[one] : "");
}

function convertThreeDigits(n: number): string {
  if (n === 0) return "";
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = "";
  if (hundred > 0) {
    result = ones[hundred] + " Hundred";
  }
  if (remainder > 0) {
    result += (result ? " " : "") + convertTwoDigits(remainder);
  }
  return result;
}

function convertToIndianWords(n: number): string {
  if (n === 0) return "Zero";

  let num = Math.floor(n);
  let words = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = num;

  if (crore > 0) {
    words += convertTwoDigits(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    words += convertThreeDigits(hundred);
  }

  return words.trim();
}

export function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = "Indian Rupees " + convertToIndianWords(rupees);

  if (paise > 0) {
    result += " and " + convertToIndianWords(paise) + " Paise";
  }

  result += " Only";
  return result;
}
