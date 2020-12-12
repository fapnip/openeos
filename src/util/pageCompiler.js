/**
 * Convert EOS Page object into javascript
 * (Runs in JS-Interpreter, not native JS)
 */
import pageCompilerUtil from '!!raw-loader!../interpreter/code/pageCompilerUtil.js'
import { decodeHTML } from 'entities'

const parser = new DOMParser()

let images = {}
let sounds = []
let targets = {}

export default function pageCompiler(page) {
  images = {}
  sounds = []
  targets = {}
  return {
    script: `
    if (!pages._getNavQueued()) (function(continueFns){
      ${pageCompilerUtil}
      /* Compiled Page */
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
    const nextIsPromptVal = `_nextIsPrompt = ${JSON.stringify(
      nextIsPrompt(commands, i)
    )} || ${!commands[i + 1] ? `_nextIsPrompt` : `false`};`
    const command = compileCommand(commands[i], i, commands)
    if (typeof command === 'string' && command !== '') {
      script.push(`function(continueFns){${nextIsPromptVal} ${command}}`)
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

const interactiveCommands = { choice: true, prompt: true, timer: true }

function nextIsPrompt(cl, i) {
  const nextCommand = cl[i + 1] || { none: {} }
  const nextCommandType = Object.keys(nextCommand)[0]
  const nextCommandObj = nextCommand[nextCommandType]
  return interactiveCommands[nextCommandType] && !nextCommandObj.isAsync
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
    return `
    var peekNext = {
      isPrompt: _nextIsPrompt,
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
    let loops = 1
    if (isAsync && c.commands && c.commands.length) {
      const nextCommand = c.commands[0] || { none: {} }
      const nextCommandType = Object.keys(nextCommand)[0]
      const nextCommandObj = nextCommand[nextCommandType]
      if (nextCommandType === 'eval') {
        const loopMatch = (nextCommandObj.script || '').match(
          /(\/\/|\/\*)[^\r\n]*oeos-timer-loops-([0-9]+)/
        )
        if (loopMatch) {
          loops = parseInt(loopMatch[2], 10)
        } else {
          const loopMatchExp = (nextCommandObj.script || '').match(
            /(\/\/|\/\*)[^\r\n]*oeos-timer-loops-<eval>(.*)<\/eval>/
          )
          if (loopMatchExp) {
            loops = '$' + loopMatchExp[2]
          }
        }
      }
    }
    return `${
      isAsync
        ? ``
        : `
    var nextCmdFns = ${compileCommandsToArray(cl.splice(i + 1))};
    `
    }
    new Timer({
      duration: ${buildExpression(c.duration)},
      loops: ${buildExpression(loops)},
      style: ${JSON.stringify(c.style)},
      isAsync: ${JSON.stringify(isAsync)},
      onTimeout: ${
        isAsync
          ? `function() {
        _doCommandFns(${compileCommandsToArray(c.commands)}, [], []);
      }`
          : `null`
      },
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
    sounds.push(c)
    return `
    new Sound({
      locator: ${JSON.stringify(c.locator)},
      id: ${JSON.stringify(c.id)},
      loops: ${JSON.stringify(c.loops)},
      volume: ${JSON.stringify(c.volume)},
      background: ${JSON.stringify(c.background)}
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
        _navId = pages._getNavId(); // Allow execution on any page
        _doCommandFns(${compileCommandsToArray(c.buttonCommands)}, [], []);
      },
      onTimeout: function () {
        _navId = pages._getNavId(); // Allow execution on any page
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
  'nyx.page': (c, i, cl) => {
    const commands = []
    if (c.media) {
      commands.push({
        image: {
          locator: c.media['nyx.image'],
        },
      })
    }
    if (c.text) {
      commands.push({
        say: {
          label: c.text,
          mode: 'instant',
        },
      })
    }
    const hidden = c.hidden
    if (hidden) {
      commands.push(hidden)
    }
    const action = c.action
    if (action) {
      const timer = action['nyx.timer']
      if (timer) {
        timer.push({
          timer: {
            ...timer,
          },
        })
      }
      const buttons = action['nyx.buttons']
      if (buttons) {
        commands.push({
          choice: {
            options: buttons,
          },
        })
      }
    }
    return `
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
  if (typeof string !== 'string') return JSON.stringify('')
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
    const evExpression = decodeHTML(ev.innerHTML).trim()
    if (evExpression.length) {
      result.push(wrap(evExpression, 'e.toString()'))
    }
    docstring = afterEv
  }
  if (docstring.length) {
    result.push(JSON.stringify(docstring))
  }
  if (!result.length) return JSON.stringify('')
  return result.join(' + ')
}
