import { parseEosDuration } from '../util'

let idCounter = 0

/*
  this.EVAL_ERROR = createErrorSubclass('EvalError');
  this.RANGE_ERROR = createErrorSubclass('RangeError');
  this.REFERENCE_ERROR = createErrorSubclass('ReferenceError');
  this.SYNTAX_ERROR = createErrorSubclass('SyntaxError');
  this.TYPE_ERROR = createErrorSubclass('TypeError');
  this.URI_ERROR = createErrorSubclass('URIError');
*/

export default {
  data: () => ({
    notifications: [],
  }),
  methods: {
    getNotification(id) {
      return {
        setTitle: () => {},
        remove: () => {},
      }
    },
    removeNotification(notificationId) {
      if (!notificationId) return
      this.notifications = this.notifications.filter(
        n => n.id !== notificationId
      )
    },
    getNotificationById(notificationId) {
      return this.notifications.find(t => t.id === notificationId)
    },
    installNotification(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let id = optProps.id || '__nt_' + ++idCounter
        this.removeNotification(id)

        const pseudoItem = interpreter.createObjectProto(proto)
        const notification = {}
        notification.pseudoItem = () => pseudoItem
        pseudoItem._item = notification
        vue.$set(notification, 'title', this.sanitizeHtml(optProps.title || ''))
        vue.$set(
          notification,
          'buttonLabel',
          this.sanitizeHtml(optProps.buttonLabel || '')
        )
        notification.id = id

        notification.timerDuration =
          (optProps.timerDuration &&
            parseEosDuration(optProps.timerDuration)) ||
          null
        notification.id = id
        notification.onTimeout = () => {
          if (optProps.onTimeout) {
            vue.removeNotification(notification.id)
            interpreter.queueFunction(optProps.onTimeout, pseudoItem)
            interpreter.run()
          }
        }
        notification.onClick = () => {
          if (optProps.onClick) {
            interpreter.queueFunction(optProps.onClick, pseudoItem)
            vue.removeNotification(notification.id)
            interpreter.run()
          }
        }
        notification.ready = el => {
          notification._o_el = el
          if (optProps.ready) {
            interpreter.queueFunction(
              optProps.ready,
              pseudoItem,
              this.getHTMLElementPseudo(el, true)
            )
            interpreter.run()
          }
        }
        this.notifications.push(notification)
        return pseudoItem
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Notification', manager)

      interpreter.setProperty(
        manager,
        'get',
        interpreter.createNativeFunction(id => {
          const result = this.getNotificationById(id)
          return result && result.pseudoItem()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'getAll',
        interpreter.createNativeFunction(() => {
          return interpreter.arrayNativeToPseudo(
            this.notifications.map(n => n.id)
          )
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this._item.id
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeNotification(this._item.id)
      })

      interpreter.setNativeFunctionPrototype(manager, 'buttonLabel', function(
        val
      ) {
        if (!arguments.length) {
          return this._item.buttonLabel
        }
        this._item.buttonLabel = vue.sanitizeHtml(val)
        return this
      })

      // For compatibility with EOS
      interpreter.setNativeFunctionPrototype(manager, 'setTitle', function(
        title
      ) {
        this._item.title = vue.sanitizeHtml(title)
        return this
      })

      // Getter / setter
      interpreter.setNativeFunctionPrototype(manager, 'title', function(val) {
        if (!arguments.length) {
          return this._item.title
        }
        this._item.title = val
        return this
      })
    },
  },
}
