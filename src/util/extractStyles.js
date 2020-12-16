const styleSheetMatcher = /\/\*--oeos-stylesheet([\s\S]+?)\*\//

export default function(script) {
  // console.log('Extracting styles from', script)
  if (!script)
    return {
      styles: {},
      script: script,
    }
  const styles = {}
  let match = script.match(styleSheetMatcher)
  while (match) {
    styles[match[1]] = true
    script = script.replace(match[0], '')
    match = script.match(styleSheetMatcher)
  }
  return {
    script,
    styles,
  }
}
