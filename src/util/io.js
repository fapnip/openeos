import SanitizeFilename from 'sanitize-filename'

const extensionMap = {
  'audio/mpeg': 'mp3',
  'image/jpeg': 'jpg',
}

const resolved = {}

export const FIX_POLLUTION = encodeURIComponent(
  '___oeos:' + window.location.hostname
)

export const extToType = Object.entries(extensionMap).reduce((a, e) => {
  a[e.value] = e.key
  return a
}, {})

export const encodeForCorsProxy = (url, query) => {
  const parts = url.split('?')
  url = parts[0]
  query = query || parts[1]
  const proxy = process.env.VUE_APP_CORS_PROXY
  const encode = process.env.VUE_APP_CORS_PROXY_ENCODE === 'true'
  const querySep = process.env.VUE_APP_CORS_PROXY_QUERY_SEPARATOR
  // const querySep = proxy.match(/\?/) ? '&' : '?'
  if (encode) {
    return proxy + encodeURIComponent(url + (query ? '?' + query : ''))
  } else {
    return proxy + url + (query ? querySep + query : '')
  }
}
export const corsProxyHeaders = () => {
  const headerJson = process.env.VUE_APP_CORS_PROXY_HEADERS
  if (headerJson) {
    try {
      const headers = JSON.parse(headerJson)
      if (
        typeof headers === 'object' &&
        !Array.isArray(headers) &&
        Object.keys(headers).length
      ) {
        return headers
      }
    } catch (e) {
      console.error('Invalid JSON for VUE_APP_CORS_PROXY_HEADERS', headerJson)
    }
  }
  return {}
}

export const buildHref = (item, smaller, validator) => {
  if (item.href) {
    if (validator) {
      const href = validator(item.href)
      if (href && !href.match(/^#/)) {
        return href
      }
    } else {
      return item.href
    }
  }
  // console.log('Building href for:', item)
  if (!item.type || item.type.match(/^image/)) {
    smaller = smaller || screen.width <= 1024 // User smaller images on lower res devices
    let result = resolved[item.hash]
    if (result) return result
    result = `https://media.milovana.com/timg/tb_${smaller ? 'l' : 'xl'}/${
      item.hash
    }.jpg?${FIX_POLLUTION}`
    resolved[item.hash] = result
    return result
  } else {
    return `https://media.milovana.com/timg/${item.hash}.${
      extensionMap[item.type]
    }?${FIX_POLLUTION}`
  }
}

export function downloadObjectAsJson(exportObj, exportName, ext, type) {
  var dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(exportObj))
  var downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute(
    'download',
    exportName + (ext ? '.' + ext : '.json')
  )
  document.body.appendChild(downloadAnchorNode) // required for firefox
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

export function convertToValidFilename(string) {
  return SanitizeFilename(string).replace(/\s+/, ' ')
}

function readBlob(b) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader()

    reader.onloadend = function() {
      resolve(reader.result)
    }

    // TODO: hook up reject to reader.onerror somehow and try it

    reader.readAsDataURL(b)
  })
}

export function acronym(text) {
  return text
    .split(/\s+/)
    .reduce(
      (accumulator, word) =>
        accumulator +
        (word.match(/^[a-z]/i) && !word.match(/[0-9]/) ? word.charAt(0) : ''),
      ''
    )
}

function numPad(val, len) {
  return (val || 0).toString().padStart(len, 0)
}

export async function downloadEosFile(file, smaller) {
  const url = buildHref(file, smaller)
  const response = await fetch(encodeForCorsProxy(url), {
    headers: corsProxyHeaders(),
  })
  const blob = await response.blob()
  const content = await readBlob(blob)
  file.href = content
  return (content && content.length) || 0
}

export function getFormattedDateForFile() {
  var date = new Date()
  var str =
    date.getFullYear() +
    numPad(date.getMonth() + 1, 2) +
    numPad(date.getDate(), 2) +
    '-' +
    numPad(date.getHours(), 2) +
    numPad(date.getMinutes(), 2)
  return str
}
