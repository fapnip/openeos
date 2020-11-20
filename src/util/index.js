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

export const extensionMap = {
  'audio/mpeg': 'mp3',
  'image/jpeg': 'jpg',
}

export const buildHref = (item, smaller) => {
  if (item.href) {
    return item.href
  }
  // console.log('Building href for:', item)
  if (!item.type || item.type.match(/^image/)) {
    return `https://media.milovana.com/timg/tb_${smaller ? 'l' : 'xl'}/${
      item.hash
    }.jpg`
  } else {
    return `https://media.milovana.com/timg/${item.hash}.${
      extensionMap[item.type]
    }`
  }
}
