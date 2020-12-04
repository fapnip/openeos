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

        const notification = interpreter.createObjectProto(proto)
        vue.$set(notification, 'title', optProps.title || '')
        vue.$set(notification, 'buttonLabel', optProps.buttonLabel || '')
        notification.id = id

        notification.timerDuration =
          (optProps.timerDuration &&
            parseEosDuration(optProps.timerDuration)) ||
          null
        notification.id = id
        notification.onTimeout = () => {
          if (optProps.onTimeout) {
            vue.removeNotification(notification.id)
            interpreter.queueFunction(optProps.onTimeout, notification)
            interpreter.run()
          }
        }
        notification.onClick = () => {
          if (optProps.onClick) {
            interpreter.queueFunction(optProps.onClick, notification)
            vue.removeNotification(notification.id)
            interpreter.run()
          }
        }
        this.notifications.push(notification)
        return notification
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Notification', manager)

      interpreter.setProperty(
        manager,
        'get',
        interpreter.createNativeFunction(id => {
          return this.getNotificationById(id)
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

      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this.id
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeNotification(this.id)
      })

      interpreter.setNativeFunctionPrototype(manager, 'buttonLabel', function(
        val
      ) {
        if (!arguments.length) {
          return this.buttonLabel
        }
        this.buttonLabel = val
        return this
      })

      // For compatibility with EOS
      interpreter.setNativeFunctionPrototype(manager, 'setTitle', function(
        title
      ) {
        this.title = title
        return this
      })

      // Getter / setter
      interpreter.setNativeFunctionPrototype(manager, 'title', function(val) {
        if (!arguments.length) {
          return this.title
        }
        this.title = val
        return this
      })
    },
  },
}
