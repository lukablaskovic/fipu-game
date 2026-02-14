import generateRandomUsername from "generate-random-username";

export const generateRandomNickname = () => {
  return generateRandomUsername({
    separator: "_",
    digits: 0,
    capitalize: false,
  });
};
