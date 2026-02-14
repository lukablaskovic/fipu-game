const labelMap = {
  banana: 'banana',
  beach: 'plaža',
  bicycle: 'bicikl',
  burek: 'burek',
  bus: 'autobus',
  car: 'auto',
  chair: 'stolica',
  cocktail: 'koktel',
  dog: 'pas',
  goat: 'koza',
  heart: 'srce',
  laptop: 'laptop',
  moon: 'mjesec',
  olive_oil: 'maslinovo ulje',
  phone: 'telefon',
  train: 'vlak',
  tree: 'drvo',
}

const fileNames = [
  'banana_01.png',
  'beach_01.png',
  'beach_02.png',
  'bicycle_01.png',
  'bicycle_02.png',
  'burek_01.png',
  'bus_01.png',
  'bus_02.png',
  'car_01.png',
  'car_02.png',
  'chair_01.png',
  'cocktail_01.png',
  'cocktail_02.png',
  'dog_01.png',
  'dog_02.png',
  'goat_01.png',
  'goat_02.png',
  'heart_01.png',
  'laptop_01.png',
  'laptop_02.png',
  'moon_01.png',
  'olive_oil_01.png',
  'olive_oil_02.png',
  'phone_01.png',
  'train_01.png',
  'train_02.png',
  'tree_01.png',
  'tree_02.png',
]

const getBaseKey = (fileName) => {
  const withoutExtension = fileName.replace('.png', '')
  return withoutExtension.replace(/_\d+$/, '')
}

export const aiTrainFrames = fileNames.map((fileName) => {
  const baseKey = getBaseKey(fileName)

  return {
    id: fileName,
    label: labelMap[baseKey] ?? baseKey,
    path: `/photos-ai-train-quiz/${fileName}`,
  }
})

export const aiTrainLabels = [...new Set(aiTrainFrames.map((frame) => frame.label))]
