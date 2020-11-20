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
        notification.title = optProps.title || ''
        notification.buttonLabel = optProps.buttonLabel || ''
        notification.id = id

        notification.timerDuration =
          (optProps.timerDuration &&
            parseEosDuration(optProps.timerDuration)) ||
          null
        notification.id = id
        notification.onTimeout = () => {
          if (optProps.onTimeout) {
            interpreter.appendFunction(optProps.onTimeout, notification)
            vue.removeNotification(notification.id)
            interpreter.run()
          }
        }
        notification.onClick = () => {
          if (optProps.onClick) {
            interpreter.appendFunction(optProps.onClick, notification)
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

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeNotification(this.id)
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'setButtonLabel',
        function(buttonLabel) {
          vue.$set(this, 'buttonLabel', buttonLabel)
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'setTitle', function(
        title
      ) {
        vue.$set(this, 'title', title)
      })
    },
  },
}
