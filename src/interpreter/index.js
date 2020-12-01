// Load Interpreter
import acorn from './acorn'
import { Interpreter } from './interpreter'

Interpreter.prototype.parseCode = function(code) {
  return acorn.parse(code, Interpreter.PARSE_OPTIONS)
}

/**
 * Execute the interpreter to program completion.  Vulnerable to infinite loops.
 * @return {boolean} True if a execution is asynchronously blocked,
 *     false if no more instructions.
 */
Interpreter.prototype.run = function() {
  if (this.running_) {
    // console.log('Already running')
    return this.paused_
  }
  this.running_ = true
  try {
    while (!this.paused_ && this.step()) {
      //
    }
  } catch (e) {
    this.running_ = false
    throw e
  }
  this.running_ = false
  return this.paused_
}

export default Interpreter
