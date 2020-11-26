/**
 * Convert EOS Page object into javascript
 * (Runs in JS-Interpreter, not native JS)
 */
import pageCompilerUtil from '!!raw-loader!../interpreter/code/pageCompilerUtil.js'
const parser = new DOMParser()

let images = {}
let sounds = {}
let targets = {}

export default function pageCompiler(page) {
  images = {}
  sounds = {}
  targets = {}
  return {
    script: `
    (function(continueFns){
      ${pageCompilerUtil}
      _doCommandFns(${compileCommandsToArray(page)}, continueFns, []);
    })([])
    `,
    images: images,
    sounds: sounds,
    targets: targets,
  }
}

function compileCommandsToArray(commands) {
  if (!commands) return '[]'
  const script = []
  commands = commands.slice()
  for (let i = 0; i < commands.length; i++) {
    const command = compileCommand(commands[i], i, commands)
    if (typeof command === 'string' && command !== '') {
      script.push(`function(continueFns){${command}}`)
    }
  }
  return `[${script.join(`,`)}]`
}

function compileCommand(command, index, commands) {
  // console.log('Compiling command', command, index, commands)
  const commandType = Object.keys(command)[0]
  const cfn = commandList[commandType]
  if (!cfn) {
    throw new TypeError('Unknown command: ' + commandType)
  }
  return cfn(command[commandType], index, commands)
}

const commandList = {
  noop: () => 'return false;',
  if: (c, i, cl) => {
    return `
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    if (${wrap(c.condition)}) {
      _doCommandFns(${compileCommandsToArray(
        c.commands
      )}, nextCmdFns, continueFns);
    } else {
      _doCommandFns(${compileCommandsToArray(
        c.elseCommands
      )}, nextCmdFns, continueFns);
    }
    return true;
    `
  },
  eval: c => `
  ${isolate(c.script)}
  return false;
  `,
  say: (c, i, cl) => {
    var nextCommand = cl[i + 1] || { none: {} }
    var nextCommandType = Object.keys(nextCommand)[0]
    var nextCommandObj = nextCommand[nextCommandType]
    return `
    var peekNext = {
      type: ${JSON.stringify(nextCommandType)},
      isAsync: ${JSON.stringify(nextCommandObj.isAsync)},
    };
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    new Say({
      label: ${parseHtmlToJS(c.label)},
      mode: ${JSON.stringify(c.mode)},
      nextCommand: peekNext,
      duration: ${buildExpression(c.duration)},
      allowSkip: ${JSON.stringify(c.allowSkip)},
      align: ${JSON.stringify(c.align)},
      onContinue: function() {
        _doCommandFns(nextCmdFns, continueFns, []);
      }
    })
    return true;
    `
  },
  timer: (c, i, cl) => {
    const isAsync = !!c.isAsync || (c.commands && c.commands.length)
    return `${
      isAsync
        ? ``
        : `
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    `
    }
    new Timer({
      duration: ${buildExpression(c.duration)},
      style: ${JSON.stringify(c.style)},
      isAsync: ${JSON.stringify(isAsync)},
      keepState: ${JSON.stringify(c.keepState)},
      threshold: {10000: {color: 'orange'}, 5000: {color: 'red'}},
      onTimeout: ${
        isAsync
          ? `function() {
        _doCommandFns(${compileCommandsToArray(c.commands)}, [], []);
      }`
          : `null`
      },
      onThreshold: null,
      onContinue: ${
        isAsync
          ? `null`
          : `function() {
        _doCommandFns(nextCmdFns, continueFns, []);
      }`
      }
    })
    return ${!isAsync};
    `
  },
  image: c => {
    images[c.locator] = false
    return `
    pages.setImage(${buildExpression(c.locator)});
    return false;
    `
  },
  choice: (c, i, cl) => {
    return `
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    new Choice({
      options: [${buildChoiceOptions(c.options)}],
      onContinue: function() {
        _doCommandFns(nextCmdFns, continueFns, []);
      }
    })
    return true;
    `
  },
  prompt: (c, i, cl) => {
    let v = c.variable || '__lastPromptVal'
    return `
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    new Prompt({
      onInput: function (v) {
        if (!_isComplete()) {
          window[${JSON.stringify(v)}] = v
          _doCommandFns(nextCmdFns, continueFns, []);
        }
      }
    })
    return true;
    `
  },
  'audio.play': c => {
    sounds[c.locator] = false
    return `
    new Sound({
      locator: ${buildExpression(c.locator)},
      id: ${JSON.stringify(c.id)},
      loops: ${buildExpression(c.loops)},
      volume: ${buildExpression(c.volume)},
      background: ${buildExpression(c.background)}
    }, true)
    return false;
    `
  },
  'notification.create': c => {
    return `
    new Notification({
      title: ${parseHtmlToJS(c.title)},
      id: ${JSON.stringify(c.id)},
      timerDuration: ${buildExpression(c.timerDuration)},
      buttonLabel: ${parseHtmlToJS(c.buttonLabel)},
      onClick: function () {
        _navId = pages.getNavId(); // Allow execution on any page
        _doCommandFns(${compileCommandsToArray(c.buttonCommands)}, [], []);
      },
      onTimeout: function () {
        _navId = pages.getNavId(); // Allow execution on any page
        _doCommandFns(${compileCommandsToArray(c.timerCommands)}, [], []);
      }
    });
    return false;
    `
  },
  'notification.remove': c => {
    return `
    var notification = Notification.get(${JSON.stringify(c.id)});
    if (notification) {
      notification.remove();
    }
    return false;
    `
  },
  goto: c => {
    targets[c.target] = true
    return `
    pages.goto(${buildExpression(c.target)});
    return false;
    `
  },
  enable: c => {
    return `
    pages.enable(${buildExpression(c.target)});
    return false;
    `
  },
  disable: c => {
    return `
    pages.disable(${buildExpression(c.target)});
    return false;
    `
  },
  end: () => {
    return `
    pages.end();
    return false;
    `
  },
}

function buildChoiceOptions(options) {
  return (options || [])
    .reduce((a, o) => {
      a.push(buildChoiceOption(o))
      return a
    }, [])
    .join(',')
}

function buildChoiceOption(o) {
  const hasVisible = 'visible' in o
  return `{
    label: ${parseHtmlToJS(o.label)},
    ${hasVisible ? `visible: ${buildExpression(o.visible)},` : ``}
    color: ${buildExpression(o.color)},
    onSelect: function () {
      _doCommandFns(${compileCommandsToArray(
        o.commands
      )}, nextCmdFns, continueFns)
    }
  }`
}

function wrap(script, onerror) {
  return `
  (function() {try {return _globalEval(${JSON.stringify(script)})} 
    catch (e) {console.error(
      e.toString(), 
      'In EVAL', 
      ${JSON.stringify(script)}
      );return ${onerror || ''}}
  })()`
}

function isolate(script) {
  return `
  try {_globalEval(${JSON.stringify(script)})} 
    catch (e) {console.error(
      e.toString(),
      'In EVAL', 
      ${JSON.stringify(script)}
      )}`
}

const expressionRegexp = /^\$/

function buildExpression(exp) {
  if (typeof exp !== 'string' || !exp || !exp.match(expressionRegexp)) {
    return JSON.stringify(exp)
  }
  return wrap(exp.replace(expressionRegexp, ''))
}

// Convert HTML string to in-line javascript string expression
// Replace ...<eval>expression</eval>... with "..." + (isolated eval expression) + "..."
// (Further xss filtering comes at run time/render with markupFilter)
function parseHtmlToJS(string) {
  if (typeof string !== 'string') return null
  const result = []
  const doc = parser
    .parseFromString(string, 'text/html')
    .getElementsByTagName('body')[0]
  const evs = doc.getElementsByTagName('eval')
  let docstring = doc.innerHTML
  for (const ev of evs) {
    const evHtml = ev.outerHTML
    const i = docstring.indexOf(evHtml)
    const beforeEv = docstring.slice(0, i)
    const afterEv = docstring.slice(i + evHtml.length, docstring.length)
    if (beforeEv.length) {
      result.push(JSON.stringify(beforeEv))
    }
    const evExpression = ev.innerHTML.trim()
    if (evExpression.length) {
      result.push(wrap(evExpression, 'e.toString()'))
    }
    docstring = afterEv
  }
  if (docstring.length) {
    result.push(JSON.stringify(docstring))
  }
  return result.join(' + ')
}
