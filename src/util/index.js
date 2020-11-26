import Duration from 'duration-js'

export const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const parseEosDuration = duration => {
  if (((duration || '') + '').match(/^[^-]+-/)) {
    const [min, max] = duration
      .split('-')
      .map(d => new Duration(d).milliseconds())
    return getRandomInt(min, max)
  } else {
    return new Duration(duration).milliseconds()
  }
}
