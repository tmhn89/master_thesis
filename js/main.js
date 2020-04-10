
const ZOOM_INTERACTION_LEVEL      = 14
const SNAPPING_ANIMATION_DURATION = 300

var addressBook = []
var reasonGroups = []
var maps = bubbleMaps()
var periodSelector = timeline()

console.log('-- Start --', new Date())
Promise.all([fetchAddressLocation(), fetchReasonGroups(), fetchViolationData()])
  .then(data => {
    addressBook = data[0]
    reasonGroups = data[1]

    periodSelector = periodSelector.data(getDatasetMonthlySummary(data[2]))
    periodSelector('periodSelector')

    // pass data to bubble map
    maps = maps.violationData(data[2])
    // render the viz to html
    maps('bubblemaps')

    periodSelector.on('changed', event => {
      maps.filter({
        period: event.detail.period
      })
    })

    console.log('-- Done loading --', new Date())
  })


