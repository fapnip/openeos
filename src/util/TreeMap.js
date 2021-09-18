/**
 * TreeMap.js (Modified 2020-12-17 to add floorEntry)
 *
 * MIT License
 *
 * Copyright (c) 2016-2018 Adrian Wirth
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export default function TreeMap() {
  var root = null
  var keyType = undefined
  var length = 0

  return {
    each: each,
    set: set,
    get: get,
    floorEntry: floorEntry,
    getTree: getTree,
    getLength: getLength,
    getMaxKey: getMaxKey,
    getMinKey: getMinKey,
    remove: remove,
  }

  function checkKey(key, checkKeyType) {
    var localKeyType = typeof key

    if (
      localKeyType !== 'number' &&
      localKeyType !== 'string' &&
      localKeyType !== 'boolean'
    ) {
      throw new Error("'key' must be a number, a string or a boolean")
    }

    if (checkKeyType === true && localKeyType !== keyType) {
      throw new Error('All keys must be of the same type')
    }

    return localKeyType
  }

  function call(callback) {
    var args = Array.prototype.slice.call(arguments, 1)

    if (typeof callback === 'function') {
      callback.apply(void 0, args)
    }
  }

  function getTree() {
    return root
  }

  function getLength() {
    return length
  }

  function each(callback) {
    internalEach(root, callback)
  }

  function internalEach(node, callback, internalCallback) {
    if (node === null) {
      return call(internalCallback)
    }

    internalEach(node.left, callback, function() {
      call(callback, node.value, node.key)

      internalEach(node.right, callback, function() {
        call(internalCallback)
      })
    })
  }

  function get(key) {
    checkKey(key)

    return internalGet(key, root)
  }

  function internalGet(key, node) {
    if (node === null) {
      return undefined
    }

    if (key < node.key) {
      return internalGet(key, node.left)
    } else if (key > node.key) {
      return internalGet(key, node.right)
    } else {
      return node.value
    }
  }

  function floorEntry(key, node) {
    checkKey(key)

    return internalFloorEntry(key, node || root, undefined, undefined, node)
  }

  function internalFloorEntry(key, node, last, last2, ignore) {
    if (node === null) {
      if (last && last !== ignore && last.key <= key) {
        // console.log('Near match', key, last, ignore)
        return { key: last.key, value: last.value, node: last }
      }
      if (last2 && last2 !== ignore && last2.key <= key) {
        // console.log('Near match2', key, last2, ignore)
        return { key: last2.key, value: last2.value, node: last2 }
      }
      // console.log('Null Match', key, node, last, ignore)
      return undefined
    }

    const nKey = node.key
    if (key < nKey) {
      return internalFloorEntry(key, node.left, node, last, ignore)
    } else if (key > nKey) {
      if (last && last !== ignore && last.key <= key) {
        // console.log('Near match middle', key, last, ignore)
        return { key: last.key, value: last.value, node: last }
      }
      if (last2 && last2 !== ignore && last2.key <= key) {
        // console.log('Near middle match2', key, last2, ignore)
        return { key: last2.key, value: last2.value, node: last2 }
      }
      return internalFloorEntry(key, node.right, node, last, ignore)
    } else if (node !== ignore) {
      // console.log('Exact match', key, last)
      return { key: nKey, value: node.value, node: node }
    }
    // console.log('No Match', key, node, last, ignore)
    return null
  }

  function set(key, value) {
    if (root === null) {
      keyType = checkKey(key)
    } else {
      checkKey(key, true)
    }

    root = internalSet(key, value, root)
  }

  function internalSet(key, value, node) {
    if (node === null) {
      length++

      return {
        key: key,
        value: value,
        left: null,
        right: null,
      }
    }

    if (key < node.key) {
      const nnr = internalSet(key, value, null)
      nnr.right = node
      node = nnr
    } else if (key > node.key) {
      node.right = internalSet(key, value, node.right)
    } else {
      node.value = value
    }

    return node
  }

  function getMaxKey() {
    var maxNode = getMaxNode(root)

    if (maxNode !== null) {
      return maxNode.key
    }

    return maxNode
  }

  function getMinKey() {
    var minNode = getMinNode(root)

    if (minNode !== null) {
      return minNode.key
    }

    return minNode
  }

  function getMaxNode(node) {
    while (node !== null && node.right !== null) {
      node = node.right
    }

    return node
  }

  function getMinNode(node) {
    while (node !== null && node.left !== null) {
      node = node.left
    }

    return node
  }

  function remove(key) {
    checkKey(key)

    root = internalRemove(key, root)
  }

  function internalRemove(key, node) {
    if (node === null) {
      return null
    }

    if (key < node.key) {
      node.left = internalRemove(key, node.left)
    } else if (key > node.key) {
      node.right = internalRemove(key, node.right)
    } else {
      if (node.left !== null && node.right !== null) {
        var maxNode = getMaxNode(node.left)

        var maxNodeKey = maxNode.key
        var maxNodeValue = maxNode.value

        maxNode.key = node.key
        maxNode.value = node.value
        node.key = maxNodeKey
        node.value = maxNodeValue

        node.left = internalRemove(key, node.left)
      } else if (node.left !== null) {
        length--
        return node.left
      } else if (node.right !== null) {
        length--
        return node.right
      } else {
        length--
        return null
      }
    }

    return node
  }
}
