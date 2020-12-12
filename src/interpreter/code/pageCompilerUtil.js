/**
 * Common functions for compiled page
 */
var _navId = pages._getNavId()
// eslint-disable-next-line no-unused-vars
var _globalEval = eval
// eslint-disable-next-line no-unused-vars
var _nextIsPrompt = false

// eslint-disable-next-line no-unused-vars
var _doCommandFns = function(commandFns, continueFns, continueFns2) {
  if (!commandFns.length) {
    if (continueFns.length) {
      return _doCommandFns(continueFns, continueFns2, [])
    }
    if (continueFns2.length) {
      return _doCommandFns(continueFns2, [], [])
    }
    return
  }

  var cmdFn = commandFns.shift()
  var waitState = false
  while (cmdFn && !_isComplete()) {
    waitState = cmdFn([
      function() {
        if (continueFns.length) {
          return _doCommandFns(continueFns, continueFns2, [])
        }
        if (continueFns2.length) {
          return _doCommandFns(continueFns2, [], [])
        }
        return
      },
    ])
    cmdFn = commandFns.shift()
  }
  if (!waitState) {
    return _doCommandFns(continueFns, continueFns2, [])
  }
  return waitState
}

var _isComplete = function() {
  return pages._getNavId() !== _navId
}
