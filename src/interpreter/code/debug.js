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
    var _nextIsPrompt = false

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
          _nextIsPrompt = undefined

          try {
            _globalEval(
              "console.log('currentPageId', pages.currentPageId)\r\nconsole.log('Page Start Loading')\r\nsettings.option1 = 'test1'\r\npages.debug = true;\r\nvar testInter = 'Test 123'\r\nwindow.windowVar = 'Yep, it works.'\r\n\r\n// pages._addEventListener('test', function(){\r\n//   console.log('test')\r\n// })"
            )
          } catch (e) {
            console.error(
              e.toString(),
              'In EVAL',
              "console.log('currentPageId', pages.currentPageId)\r\nconsole.log('Page Start Loading')\r\nsettings.option1 = 'test1'\r\npages.debug = true;\r\nvar testInter = 'Test 123'\r\nwindow.windowVar = 'Yep, it works.'\r\n\r\n// pages._addEventListener('test', function(){\r\n//   console.log('test')\r\n// })"
            )
          }
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined
          new Sound(
            {
              locator: 'file:12bpm.mp3',
              id: 'testbpm',
              loops: 0,
              volume: undefined,
              background: true,
            },
            true
          )
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined
          new Video(
            {
              locator:
                'file:12bpm.mp3+(|oeos-video:https%3A%2F%2Fthumbs2.redgifs.com%2FImmaculateBothIndianelephant-mobile.mp4)',
              id: 'test-video',
              loops: 1,
              volume: 0.05,
              background: true,
            },
            true
          )
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined

          try {
            _globalEval(
              "console.log('testbpm', Sound.get('testbpm'))\r\nfunction oeosOnclickTest(e) {\r\n  console.log('oeosOnclickTest', e)\r\n}\r\nnew Say({\r\n  label: '<script>console.log(\"bad\")</script><iframe>A test</iframe><a href=\"https://a-bad-link\">A Link</a><img srcset=\"https://abad.url,https://badimageurl2\"></img><script>console.log(\"bad script\")</script><style>.goodstyle {backgournd: url(\\'https://bad.link\\');backgournd: url(\\'https://bad.link2\\');font-size: 30px;}</style><p style=\"background: url(https://another-bad-url)\" onclick=\"console.log(\\'bad\\')\" class=\"goodstyle\">Yest clickly</p>'\r\n})\r\n\r\nvar mapView = new Notification({\r\n  title: \"<p>Test</p>\",\r\n  ready: function(el) {\r\n    el.getElementsByTagName('p')[0].style.color = 'red'\r\n  }\r\n})\r\n\r\nvar imageOverlay = new Overlay({\r\n  type: \"page\",\r\n  ready: function(el) {\r\n    console.log('imageOverlay ready', el)\r\n    // el.getElementsByTagName('p')[0].style.color = 'red'\r\n  }\r\n})"
            )
          } catch (e) {
            console.error(
              e.toString(),
              'In EVAL',
              "console.log('testbpm', Sound.get('testbpm'))\r\nfunction oeosOnclickTest(e) {\r\n  console.log('oeosOnclickTest', e)\r\n}\r\nnew Say({\r\n  label: '<script>console.log(\"bad\")</script><iframe>A test</iframe><a href=\"https://a-bad-link\">A Link</a><img srcset=\"https://abad.url,https://badimageurl2\"></img><script>console.log(\"bad script\")</script><style>.goodstyle {backgournd: url(\\'https://bad.link\\');backgournd: url(\\'https://bad.link2\\');font-size: 30px;}</style><p style=\"background: url(https://another-bad-url)\" onclick=\"console.log(\\'bad\\')\" class=\"goodstyle\">Yest clickly</p>'\r\n})\r\n\r\nvar mapView = new Notification({\r\n  title: \"<p>Test</p>\",\r\n  ready: function(el) {\r\n    el.getElementsByTagName('p')[0].style.color = 'red'\r\n  }\r\n})\r\n\r\nvar imageOverlay = new Overlay({\r\n  type: \"page\",\r\n  ready: function(el) {\r\n    console.log('imageOverlay ready', el)\r\n    // el.getElementsByTagName('p')[0].style.color = 'red'\r\n  }\r\n})"
            )
          }
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined
          pages.setImage(
            'file:no-52390002.jpg+(|oeos:%5B%22https%3A%2F%2Fi.ibb.co%2FZJ1w2xF%2F23794538.webp%22%2C%22https%3A%2F%2Fi.ibb.co%2FY3h919x%2F24017618.webp%22%2C%22https%3A%2F%2Fi.ibb.co%2F1fXfzjn%2F20786292.gif%22%5D)'
          )
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined

          try {
            _globalEval(
              '// Wrap in immediate function to avoid pollution of global scope\r\n(function(){\r\n\r\n  // Create a new overlay object\r\n  // var myOverlay = new Overlay({\r\n  //   type: \'page\',\r\n  //   ready: function(el) {\r\n  //     el.innerHTML = \'<video class="video-player" controls src="https://thumbs2.redgifs.com/SleepyCornyKakapo.webm" width="250"></video>\'\r\n  //   }\r\n  // })\r\n  \r\n  pages.addOnNextImage(function(){\r\n    // Remove my overlay when the images changes\r\n    myOverlay.remove()\r\n  })\r\n\r\n})()'
            )
          } catch (e) {
            console.error(
              e.toString(),
              'In EVAL',
              '// Wrap in immediate function to avoid pollution of global scope\r\n(function(){\r\n\r\n  // Create a new overlay object\r\n  // var myOverlay = new Overlay({\r\n  //   type: \'page\',\r\n  //   ready: function(el) {\r\n  //     el.innerHTML = \'<video class="video-player" controls src="https://thumbs2.redgifs.com/SleepyCornyKakapo.webm" width="250"></video>\'\r\n  //   }\r\n  // })\r\n  \r\n  pages.addOnNextImage(function(){\r\n    // Remove my overlay when the images changes\r\n    myOverlay.remove()\r\n  })\r\n\r\n})()'
            )
          }
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined
          return false
        },
        function(continueFns) {
          _nextIsPrompt = false
          return false
        },
        function(continueFns) {
          _nextIsPrompt = true
          new Timer({
            duration: '60s',
            loops: 1,
            style: undefined,
            isAsync: true,
            onTimeout: function() {
              _doCommandFns(
                [
                  function(continueFns) {
                    try {
                      _globalEval('// AS INTERVAL')
                    } catch (e) {
                      console.error(e.toString(), 'In EVAL', '// AS INTERVAL')
                    }
                    return false
                  },
                ],
                [],
                []
              )
            },
            onContinue: null,
          })
          return false
        },
        function(continueFns) {
          _nextIsPrompt = undefined
          var nextCmdFns = [
            function(continueFns) {
              _nextIsPrompt = undefined
              var peekNext = {
                isPrompt: _nextIsPrompt,
              }
              var nextCmdFns = [
                function(continueFns) {
                  try {
                    _globalEval("\npages.call('page2');")
                  } catch (e) {
                    console.error(
                      e.toString(),
                      'In EVAL',
                      "\npages.call('page2');"
                    )
                  }
                  return false
                },
              ]
              new Say({
                label:
                  "<p>Here's the start page. " +
                  (function() {
                    try {
                      return _globalEval('testvar3')
                    } catch (e) {
                      console.error(e.toString(), 'In EVAL', 'testvar3')
                      return e.toString()
                    }
                  })() +
                  '</p>',
                mode: undefined,
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
          new Choice({
            options: [
              {
                label: 'test',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        try {
                          _globalEval("testvar3 = 'test'")
                        } catch (e) {
                          console.error(
                            e.toString(),
                            'In EVAL',
                            "testvar3 = 'test'"
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
                  'A really, really really really really really really long label.',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
                        return false
                      },
                    ],
                    nextCmdFns,
                    continueFns
                  )
                },
              },
              {
                label: '',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
                        return false
                      },
                    ],
                    nextCmdFns,
                    continueFns
                  )
                },
              },
              {
                label: '',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
                        return false
                      },
                    ],
                    nextCmdFns,
                    continueFns
                  )
                },
              },
              {
                label: '',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
                        return false
                      },
                    ],
                    nextCmdFns,
                    continueFns
                  )
                },
              },
              {
                label: '',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
                        return false
                      },
                    ],
                    nextCmdFns,
                    continueFns
                  )
                },
              },
              {
                label: '',

                color: undefined,
                onSelect: function() {
                  _doCommandFns(
                    [
                      function(continueFns) {
                        pages.goto('start')
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
      ],
      continueFns,
      []
    )
  })([])
