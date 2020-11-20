console.log('Starting Test')
new Say({
  label: '<p>a test...</p>',
  duration: '5s',
  allowSkip: true,
  mode: 'pause',
  onContinue: function() {
    new Choice({
      options: [
        {
          label: 'Test 1',
          visible: true,
          color: 'orange',
          onSelect: function() {
            console.log('Did test1 option')
            new Timer({
              duration: 10000,
              onContinue: function() {
                console.log('Countdown Timer Ends')
                new Timer({
                  duration: 8000,
                  onTimeout: function() {
                    console.log('Countdown Timer 2 Ends')
                    new Say({
                      label: '<p>Another test...</p>',
                    })
                  },
                })
              },
            })
          },
        },
        {
          label: 'Test 2',
          visible: true,
          color: 'yellow',
          onSelect: function() {
            console.log('Did test2 option')
            new Prompt({
              onInput: function(v) {
                new Say({
                  label: '<p>Hello ' + v + '</p>',
                  onContinue: function() {
                    new Timer({
                      duration: 8000,
                      onTimeout: function() {
                        console.log('Countdown Timer 2 Ends')
                        new Say({
                          label: '<p>Another test...</p>',
                        })
                      },
                    })
                  },
                })
              },
            })
          },
        },
      ],
    })
  },
})
