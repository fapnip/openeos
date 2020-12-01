/* Page Script: start */

if (!pages._getNavQueued())
  (function(continueFns) {
    /**
     * Common functions for compiled page
     */
    var _navId = pages._getNavId()
    // eslint-disable-next-line no-unused-vars
    var _globalEval = eval

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

    /* Compiled Page */
    _doCommandFns(
      [
        function(continueFns) {
          try {
            _globalEval(
              "if (!pages.oeosVersion) {\r\n  pages.goto('module-missing')\r\n} else if (pages.oeosVersion(minVersion) < 0) {\r\n  pages.goto('module-update')\r\n}"
            )
          } catch (e) {
            console.error(
              e.toString(),
              'In EVAL',
              "if (!pages.oeosVersion) {\r\n  pages.goto('module-missing')\r\n} else if (pages.oeosVersion(minVersion) < 0) {\r\n  pages.goto('module-update')\r\n}"
            )
          }
          return false
        },
        function(continueFns) {
          pages.setImage('gallery:735c4bbe-f318-4993-809a-a71f258f3678/1104256')
          return false
        },
        function(continueFns) {
          var peekNext = {
            type: 'say',
            isAsync: undefined,
          }
          var nextCmdFns = [
            function(continueFns) {
              var peekNext = {
                type: 'image',
                isAsync: undefined,
              }
              var nextCmdFns = [
                function(continueFns) {
                  pages.setImage(
                    'file:placeholder.jpg+(|oeos:file:animated-test-*)'
                  )
                  return false
                },
                function(continueFns) {
                  var peekNext = {
                    type: 'image',
                    isAsync: undefined,
                  }
                  var nextCmdFns = [
                    function(continueFns) {
                      pages.setImage(
                        'gallery:e555e68b-fac5-46a3-9df8-d51092ab0f22/*'
                      )
                      return false
                    },
                    function(continueFns) {
                      new Timer({
                        duration: '3s',
                        loops: 0,
                        style: 'hidden',
                        isAsync: true,
                        keepState: undefined,
                        threshold: {
                          10000: { color: 'orange' },
                          5000: { color: 'red' },
                        },
                        onTimeout: function() {
                          _doCommandFns(
                            [
                              function(continueFns) {
                                try {
                                  _globalEval(
                                    '// oeos-timer-loops-0  (Tell OEOS to loop forever)'
                                  )
                                } catch (e) {
                                  console.error(
                                    e.toString(),
                                    'In EVAL',
                                    '// oeos-timer-loops-0  (Tell OEOS to loop forever)'
                                  )
                                }
                                return false
                              },
                              function(continueFns) {
                                pages.setImage(
                                  'gallery:e555e68b-fac5-46a3-9df8-d51092ab0f22/*'
                                )
                                return false
                              },
                            ],
                            [],
                            []
                          )
                        },
                        onThreshold: null,
                        onContinue: null,
                      })
                      return false
                    },
                    function(continueFns) {
                      var peekNext = {
                        type: 'choice',
                        isAsync: undefined,
                      }
                      var nextCmdFns = [
                        function(continueFns) {
                          var nextCmdFns = [
                            function(continueFns) {
                              pages.end()
                              return false
                            },
                          ]
                          new Choice({
                            options: [
                              {
                                label: 'Show me more!',

                                color: undefined,
                                onSelect: function() {
                                  _doCommandFns(
                                    [
                                      function(continueFns) {
                                        var peekNext = {
                                          type: 'none',
                                          isAsync: undefined,
                                        }
                                        var nextCmdFns = []
                                        new Say({
                                          label:
                                            '<p>Sorry, that\'s it for this demo, but there\'s plenty more OESO can or could do.</p><p>Have an idea?</p><p>Head to the forums and share your thoughts!</p><p><span style="color: #b3e5fc">https://milovana.com/forum/viewtopic.php?f=2&amp;t=23533</span></p>',
                                          mode: undefined,
                                          nextCommand: peekNext,
                                          duration: undefined,
                                          allowSkip: undefined,
                                          align: undefined,
                                          onContinue: function() {
                                            _doCommandFns(
                                              nextCmdFns,
                                              continueFns,
                                              []
                                            )
                                          },
                                        })
                                        return true
                                      },
                                    ],
                                    nextCmdFns,
                                    continueFns
                                  )
                                },
                              },
                              {
                                label: "What's the big deal?",

                                color: undefined,
                                onSelect: function() {
                                  _doCommandFns(
                                    [
                                      function(continueFns) {
                                        var peekNext = {
                                          type: 'none',
                                          isAsync: undefined,
                                        }
                                        var nextCmdFns = []
                                        new Say({
                                          label:
                                            '<p>Well, those things, and more, weren\'t possible before. </p><p>But hey, head back to the forums and let fapnip know you hate it!</p><p><span style="color: #bbdefb">https://milovana.com/forum/viewtopic.php?f=2&amp;t=23533</span></p>',
                                          mode: 'pause',
                                          nextCommand: peekNext,
                                          duration: undefined,
                                          allowSkip: undefined,
                                          align: undefined,
                                          onContinue: function() {
                                            _doCommandFns(
                                              nextCmdFns,
                                              continueFns,
                                              []
                                            )
                                          },
                                        })
                                        return true
                                      },
                                    ],
                                    nextCmdFns,
                                    continueFns
                                  )
                                },
                              },
                              {
                                label: 'Show me that GIF again!',

                                color: undefined,
                                onSelect: function() {
                                  _doCommandFns(
                                    [
                                      function(continueFns) {
                                        pages.goto('show-gif-again')
                                        return false
                                      },
                                    ],
                                    nextCmdFns,
                                    continueFns
                                  )
                                },
                              },
                            ],
                            onContinue: function() {
                              _doCommandFns(nextCmdFns, continueFns, [])
                            },
                          })
                          return true
                        },
                      ]
                      new Say({
                        label:
                          '<p>Or show a slide show while waiting for a choice...</p>',
                        mode: 'instant',
                        nextCommand: peekNext,
                        duration: undefined,
                        allowSkip: undefined,
                        align: undefined,
                        onContinue: function() {
                          _doCommandFns(nextCmdFns, continueFns, [])
                        },
                      })
                      return true
                    },
                  ]
                  new Say({
                    label: '<p>Show Animated GIFs...</p>',
                    mode: 'custom',
                    nextCommand: peekNext,
                    duration: '5s',
                    allowSkip: true,
                    align: undefined,
                    onContinue: function() {
                      _doCommandFns(nextCmdFns, continueFns, [])
                    },
                  })
                  return true
                },
              ]
              new Say({
                label:
                  "<p>With OEOS, we can do things in EOS we couldn't do before, like...</p>",
                mode: 'autoplay',
                nextCommand: peekNext,
                duration: undefined,
                allowSkip: true,
                align: undefined,
                onContinue: function() {
                  _doCommandFns(nextCmdFns, continueFns, [])
                },
              })
              return true
            },
          ]
          new Say({
            label: '<p>Hey!  Welcome to the Open EOS (OEOS) Demo!</p>',
            mode: 'autoplay',
            nextCommand: peekNext,
            duration: undefined,
            allowSkip: true,
            align: undefined,
            onContinue: function() {
              _doCommandFns(nextCmdFns, continueFns, [])
            },
          })
          return true
        },
      ],
      continueFns,
      []
    )
  })([])
