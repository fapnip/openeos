// Load Interpreter
import acorn from './acorn'
import { Interpreter } from './interpreter'

Interpreter.prototype.parseCode = function(code) {
  return acorn.parse(code, Interpreter.PARSE_OPTIONS)
}

// const interpreter = new Interpreter('')
// // Replace run with "threaded" run
// interpreter.__isR = false
// interpreter.run = function(inLoop) {
//   let ticks = 10 // Only run up to 10 interpreter ticks at a time
//   while (!this.paused_ && this.step()) {
//     interpreter.__isR = true
//     ticks--
//     if (!ticks) {
//       inLoop = false
//       setTimeout(function() {
//         interpreter.run.call(interpreter, true)
//       })
//       break
//     }
//     //
//   }
//   if (!ticks || inLoop) interpreter.__isR = false
//   return this.paused_
// }

export default Interpreter
