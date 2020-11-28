;(function(continueFns) {
  /**
   * Common functions for page compiler
   */
  var _navId = pages.getNavId()
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
    return pages.getNavId() !== _navId
  }

  _doCommandFns(
    [
      function(continueFns) {
        try {
          _globalEval('')
        } catch (e) {
          console.error(e.toString(), 'In EVAL', '')
        }
        return false
      },
      function(continueFns) {
        try {
          _globalEval(
            "var partialGame = game.hasRecentSave();\nvar doAction = function(){pages.goto('play')};\nvar loadedBeats = !beats.loaded;"
          )
        } catch (e) {
          console.error(
            e.toString(),
            'In EVAL',
            "var partialGame = game.hasRecentSave();\nvar doAction = function(){pages.goto('play')};\nvar loadedBeats = !beats.loaded;"
          )
        }
        return false
      },
      function(continueFns) {
        pages.setImage('gallery:a6068f8e-6608-437f-aefb-a94f5ee782e9/990458')
        return false
      },
      function(continueFns) {
        var nextCmdFns = [
          function(continueFns) {
            try {
              _globalEval("console.log('Doing if partial game:')")
            } catch (e) {
              console.error(
                e.toString(),
                'In EVAL',
                "console.log('Doing if partial game:')"
              )
            }
            return false
          },
          function(continueFns) {
            var nextCmdFns = [
              function(continueFns) {
                var nextCmdFns = [
                  function(continueFns) {
                    var nextCmdFns = [
                      function(continueFns) {
                        try {
                          _globalEval('beats.volume(game.volume);\ndoAction();')
                        } catch (e) {
                          console.error(
                            e.toString(),
                            'In EVAL',
                            'beats.volume(game.volume);\ndoAction();'
                          )
                        }
                        return false
                      },
                    ]
                    if (
                      (function() {
                        try {
                          return _globalEval('loadedBeats')
                        } catch (e) {
                          console.error(e.toString(), 'In EVAL', 'loadedBeats')
                          return
                        }
                      })()
                    ) {
                      _doCommandFns(
                        [
                          function(continueFns) {
                            var nextCmdFns = []

                            new Timer({
                              duration: (function() {
                                try {
                                  return _globalEval('(800)')
                                } catch (e) {
                                  console.error(
                                    e.toString(),
                                    'In EVAL',
                                    '(800)'
                                  )
                                  return
                                }
                              })(),
                              style: 'hidden',
                              isAsync: undefined,
                              keepState: undefined,
                              threshold: {
                                10000: { color: 'orange' },
                                5000: { color: 'red' },
                              },
                              onTimeout: null,
                              onThreshold: null,
                              onContinue: function() {
                                _doCommandFns(nextCmdFns, continueFns, [])
                              },
                            })
                            return true
                          },
                        ],
                        nextCmdFns,
                        continueFns
                      )
                    } else {
                      _doCommandFns([], nextCmdFns, continueFns)
                    }
                    return true
                  },
                ]
                new Choice({
                  options: [
                    {
                      label: "<u>Let's play!</u>",
                      visible: (function() {
                        try {
                          return _globalEval('!partialGame')
                        } catch (e) {
                          console.error(e.toString(), 'In EVAL', '!partialGame')
                          return
                        }
                      })(),
                      color: undefined,
                      onSelect: function() {
                        _doCommandFns(
                          [
                            function(continueFns) {
                              try {
                                _globalEval(
                                  "// Initials sounds after click to authorize on some browsers\nbeats.init();\ndoAction = function(){pages.goto('play-start')};"
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  "// Initials sounds after click to authorize on some browsers\nbeats.init();\ndoAction = function(){pages.goto('play-start')};"
                                )
                              }
                              return false
                            },
                          ],
                          nextCmdFns,
                          continueFns
                        )
                      },
                    },
                    {
                      label:
                        "What's <b><i>Blackjack</i></b> or <b><i>FapJack</i></b>?",
                      visible: (function() {
                        try {
                          return _globalEval('!partialGame')
                        } catch (e) {
                          console.error(e.toString(), 'In EVAL', '!partialGame')
                          return
                        }
                      })(),
                      color: undefined,
                      onSelect: function() {
                        _doCommandFns(
                          [
                            function(continueFns) {
                              try {
                                _globalEval(
                                  "// Initials sounds after click to authorize on some browsers\nbeats.init();\ndoAction = function(){pages.goto('instructions')};"
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  "// Initials sounds after click to authorize on some browsers\nbeats.init();\ndoAction = function(){pages.goto('instructions')};"
                                )
                              }
                              return false
                            },
                          ],
                          nextCmdFns,
                          continueFns
                        )
                      },
                    },
                    {
                      label: 'Resume my last game, please!',
                      visible: (function() {
                        try {
                          return _globalEval('partialGame')
                        } catch (e) {
                          console.error(e.toString(), 'In EVAL', 'partialGame')
                          return
                        }
                      })(),
                      color: undefined,
                      onSelect: function() {
                        _doCommandFns(
                          [
                            function(continueFns) {
                              try {
                                _globalEval(
                                  'beats.init(); // Make sure sounds are loaded and working'
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  'beats.init(); // Make sure sounds are loaded and working'
                                )
                              }
                              return false
                            },
                            function(continueFns) {
                              try {
                                _globalEval(
                                  "game.restoreState(); // Load saved state\ndoAction = function(){pages.goto('play')}; // Resume game"
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  "game.restoreState(); // Load saved state\ndoAction = function(){pages.goto('play')}; // Resume game"
                                )
                              }
                              return false
                            },
                          ],
                          nextCmdFns,
                          continueFns
                        )
                      },
                    },
                    {
                      label: "I'd like to start fresh.",
                      visible: (function() {
                        try {
                          return _globalEval('partialGame')
                        } catch (e) {
                          console.error(e.toString(), 'In EVAL', 'partialGame')
                          return
                        }
                      })(),
                      color: undefined,
                      onSelect: function() {
                        _doCommandFns(
                          [
                            function(continueFns) {
                              try {
                                _globalEval(
                                  'beats.init(); // Make sure sounds are loaded and working'
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  'beats.init(); // Make sure sounds are loaded and working'
                                )
                              }
                              return false
                            },
                            function(continueFns) {
                              try {
                                _globalEval(
                                  'game.clearState(); // Reset game state\ndoAction = function(){pages.goto(pages.getCurrentPageId())}; // Reload this page\n'
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  'game.clearState(); // Reset game state\ndoAction = function(){pages.goto(pages.getCurrentPageId())}; // Reload this page\n'
                                )
                              }
                              return false
                            },
                          ],
                          nextCmdFns,
                          continueFns
                        )
                      },
                    },
                    {
                      label: 'Settings',

                      color: undefined,
                      onSelect: function() {
                        _doCommandFns(
                          [
                            function(continueFns) {
                              try {
                                _globalEval(
                                  '// Init sounds after click to authorize on some browsers\nbeats.init();'
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  '// Init sounds after click to authorize on some browsers\nbeats.init();'
                                )
                              }
                              return false
                            },
                            function(continueFns) {
                              try {
                                _globalEval(
                                  "doAction = function(){callPage('settings');}; // Go to settings"
                                )
                              } catch (e) {
                                console.error(
                                  e.toString(),
                                  'In EVAL',
                                  "doAction = function(){callPage('settings');}; // Go to settings"
                                )
                              }
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
            if (
              (function() {
                try {
                  return _globalEval('partialGame')
                } catch (e) {
                  console.error(e.toString(), 'In EVAL', 'partialGame')
                  return
                }
              })()
            ) {
              _doCommandFns(
                [
                  function(continueFns) {
                    var peekNext = {
                      type: 'say',
                      isAsync: undefined,
                    }
                    var nextCmdFns = [
                      function(continueFns) {
                        var peekNext = {
                          type: 'none',
                          isAsync: undefined,
                        }
                        var nextCmdFns = []
                        new Say({
                          label:
                            '<p>Do you want to finish that one, or start a new one?</p>',
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
                      label:
                        '<p><span style="color: #ffffff">Looks like you have a recent partially completed game.</span></p>',
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
                ],
                nextCmdFns,
                continueFns
              )
            } else {
              _doCommandFns(
                [
                  function(continueFns) {
                    try {
                      _globalEval("console.log('Doing else partial game say')")
                    } catch (e) {
                      console.error(
                        e.toString(),
                        'In EVAL',
                        "console.log('Doing else partial game say')"
                      )
                    }
                    return false
                  },
                  function(continueFns) {
                    var peekNext = {
                      type: 'eval',
                      isAsync: undefined,
                    }
                    var nextCmdFns = [
                      function(continueFns) {
                        try {
                          _globalEval(
                            "console.log('Doing else partial game after say')"
                          )
                        } catch (e) {
                          console.error(
                            e.toString(),
                            'In EVAL',
                            "console.log('Doing else partial game after say')"
                          )
                        }
                        return false
                      },
                    ]
                    new Say({
                      label:
                        '<p>' +
                        (function() {
                          try {
                            return _globalEval(
                              'mergeObject(randomString(t.introBlurb), game)'
                            )
                          } catch (e) {
                            console.error(
                              e.toString(),
                              'In EVAL',
                              'mergeObject(randomString(t.introBlurb), game)'
                            )
                            return e.toString()
                          }
                        })() +
                        '</p>',
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
                ],
                nextCmdFns,
                continueFns
              )
            }
            return true
          },
        ]
        if (
          (function() {
            try {
              return _globalEval('!beats.loaded')
            } catch (e) {
              console.error(e.toString(), 'In EVAL', '!beats.loaded')
              return
            }
          })()
        ) {
          _doCommandFns(
            [
              function(continueFns) {
                var nextCmdFns = [
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:90bpm.mp3',
                        id: 'bpm90',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:120bpm.mp3',
                        id: 'bpm120',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:150bpm.mp3',
                        id: 'bpm150',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:180bpm.mp3',
                        id: 'bpm180',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:20bpm.mp3',
                        id: 'bpm20',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:30bpm.mp3',
                        id: 'bpm30',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:60bpm.mp3',
                        id: 'bpm60',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:240bpm.mp3',
                        id: 'bpm240',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    new Sound(
                      {
                        locator: 'file:300bpm.mp3',
                        id: 'bpm300',
                        loops: 0,
                        volume: 0,
                        background: true,
                      },
                      true
                    )
                    return false
                  },
                  function(continueFns) {
                    var peekNext = {
                      type: 'eval',
                      isAsync: undefined,
                    }
                    var nextCmdFns = [
                      function(continueFns) {
                        try {
                          _globalEval(
                            "// Load all beat sounds\nbeats.set(90);\nbeats.set(120);\nbeats.set(150);\nbeats.set(180);\nbeats.set(20);\nbeats.set(30);\nbeats.set(60);\nbeats.set(240);\nbeats.set(300);\nbeats.loaded = true;\n// sounds.get('bpmfffix').stop();\n// sounds.get('bpmfffix').play();\n// console.log('beats.getRandom', beats.getRandom())\nconsole.log('Loaded Beats')"
                          )
                        } catch (e) {
                          console.error(
                            e.toString(),
                            'In EVAL',
                            "// Load all beat sounds\nbeats.set(90);\nbeats.set(120);\nbeats.set(150);\nbeats.set(180);\nbeats.set(20);\nbeats.set(30);\nbeats.set(60);\nbeats.set(240);\nbeats.set(300);\nbeats.loaded = true;\n// sounds.get('bpmfffix').stop();\n// sounds.get('bpmfffix').play();\n// console.log('beats.getRandom', beats.getRandom())\nconsole.log('Loaded Beats')"
                          )
                        }
                        return false
                      },
                    ]
                    new Say({
                      label:
                        '<p>' +
                        (function() {
                          try {
                            return _globalEval(
                              'mergeObject(randomString(t.welcome), game)'
                            )
                          } catch (e) {
                            console.error(
                              e.toString(),
                              'In EVAL',
                              'mergeObject(randomString(t.welcome), game)'
                            )
                            return e.toString()
                          }
                        })() +
                        '</p>',
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
                if (
                  (function() {
                    try {
                      return _globalEval('DEBUG')
                    } catch (e) {
                      console.error(e.toString(), 'In EVAL', 'DEBUG')
                      return
                    }
                  })()
                ) {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        var peekNext = {
                          type: 'say',
                          isAsync: undefined,
                        }
                        var nextCmdFns = [
                          function(continueFns) {
                            var peekNext = {
                              type: 'none',
                              isAsync: undefined,
                            }
                            var nextCmdFns = []
                            new Say({
                              label:
                                '<p>*** PLEASE PLAY USING THE RELEASE VERSION ***</p>',
                              mode: 'pause',
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
                          label:
                            '<p>*** THIS IS A DEBUG VERSION OF THE GAME USED FOR DEVELOPMENT ONLY ***</p>',
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
                    ],
                    nextCmdFns,
                    continueFns
                  )
                } else {
                  _doCommandFns([], nextCmdFns, continueFns)
                }
                return true
              },
            ],
            nextCmdFns,
            continueFns
          )
        } else {
          _doCommandFns([], nextCmdFns, continueFns)
        }
        return true
      },
    ],
    continueFns,
    []
  )
})([])
