
const ZOOM_INTERACTION_LEVEL      = 14
const SNAPPING_ANIMATION_DURATION = 300

var addressBook = []
var reasonGroups = []
var maps = bubbleMaps()
var periodSelector = timeline()

var filter = {
  period: [parseTime(2019, 11), parseTime(2019, 11)],
  reason: null,
  bound: null
}

var filterDispatch = d3.dispatch('filter', 'filterChanged')

console.log('-- Start --', new Date())
Promise.all([fetchAddressLocation(), fetchReasonGroups(), fetchViolationData()])
  .then(data => {
    addressBook = data[0]
    reasonGroups = data[1]

    periodSelector = periodSelector.data(getDatasetMonthlySummary(data[2]))
    periodSelector('periodSelector')

    // pass data to bubble map
    maps = maps.violationData(data[2])
    // render the viz
    maps('bubblemaps')

    periodSelector.on('changed', event => {
      maps.filter({
        period: event.detail.period
      })
    })

    filterDispatch.on('filter', data => {
      console.log('trigger filter changing')
      Object.assign(filter, data)
      filterDispatch.call('filterChanged')
    })

    console.log('-- Done loading --', new Date())
  })


