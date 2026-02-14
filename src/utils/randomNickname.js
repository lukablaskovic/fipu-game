const adjectives = [
  "Brzi",
  "Pametni",
  "Tihi",
  "Veseli",
  "Ludi",
  "Mocni",
  "Hrabri",
  "Sretni",
];

const nouns = [
  "Robot",
  "Algoritam",
  "Coder",
  "Pixel",
  "Server",
  "Gamer",
  "Haker",
  "Model",
];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export const generateRandomNickname = () => {
  const number = Math.floor(Math.random() * 900 + 100);
  return `${randomItem(adjectives)}${randomItem(nouns)}${number}`;
};
