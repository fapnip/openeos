const extensionMap = {
  'audio/mpeg': 'mp3',
  'image/jpeg': 'jpg',
}

export const FIX_POLLUTION = encodeURIComponent(
  '__oeos:' + window.location.hostname
)

export const extToType = Object.entries(extensionMap).reduce((a, e) => {
  a[e.value] = e.key
  return a
}, {})

export const DEV_CORS_PROXY = 'https://oeos-proxy1.herokuapp.com/'
export const RELATIVE_CORS_PROXY = '/proxy.php?csurl='

export const isLocalHost = host => {
  return host.match(
    /^(localhost|(127\.[0-9]+\.[0-9]+\.[0-9]+)|(10\.[0-9]+\.[0-9]+\.[0-9]+)|(172\.1[6-9]\.[0-9]+\.[0-9]+)|(172\.2[0-9]\.[0-9]+\.[0-9]+)|(172\.3[0-1]\.[0-9]+\.[0-9]+)|(192\.168\.[0-9]+\.[0-9]+))$/i
  )
}

export const encodeForCorsProxy = (url, query) => {
  const parts = url.split('?')
  url = parts[0]
  query = query || parts[1]
  if (isLocalHost(location.hostname)) {
    return DEV_CORS_PROXY + url + (query ? '?' + query : '')
  }
  return RELATIVE_CORS_PROXY + url + (query ? '&' + query : '')
}

export const buildHref = (item, smaller) => {
  if (item.href) {
    return item.href
  }
  // console.log('Building href for:', item)
  if (!item.type || item.type.match(/^image/)) {
    return `https://media.milovana.com/timg/tb_${smaller ? 'l' : 'xl'}/${
      item.hash
    }.jpg?${FIX_POLLUTION}`
  } else {
    return `https://media.milovana.com/timg/${item.hash}.${
      extensionMap[item.type]
    }?${FIX_POLLUTION}`
  }
}

export function downloadObjectAsJson(exportObj, exportName) {
  var dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(exportObj))
  var downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', exportName + '.json')
  document.body.appendChild(downloadAnchorNode) // required for firefox
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

export function convertToValidFilename(string) {
  return string.replace(/[/|\\:*?"<>]/g, ' ')
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

export async function downloadEosFile(file, smaller) {
  const url = buildHref(file, smaller)
  const response = await fetch(encodeForCorsProxy(url))
  const blob = await response.blob()
  const content = await readBlob(blob)
  file.href = content
  return (content && content.length) || 0
}
