
const ZOOM_INTERACTION_LEVEL      = 14
const SNAPPING_ANIMATION_DURATION = 300

var addressBook   = []
var reasonGroups  = []

var maps            = bubbleMaps()
var periodSelector  = timeline()
var reasonSelector  = reasonList()

var globalFilter = {
  period: [parseTime(2019, 11), parseTime(2019, 11)],
  reason: null,
  bound: null
}

var filterDispatch = d3.dispatch('filter', 'filterChanged')

Promise.all([fetchAddressLocation(), fetchReasonGroups(), fetchViolationData()])
  .then(data => {
    // save default global variables
    addressBook   = data[0]
    reasonGroups  = data[1]

    periodSelector = periodSelector.data(data[2])
    periodSelector('periodSelector')

    // reasonSelector = reasonSelector.data(data[2])
    // reasonSelector('stats')

    // pass data to bubble map
    maps = maps.data(data[2])
    // render the viz
    maps('bubblemaps')

    filterDispatch.on('filter', data => {
      // update the filter, then trigger filter change event
      Object.assign(globalFilter, data)
      // filteredData = filterData(allData, filter)

      filterDispatch.call('filterChanged')
    })
  })

/**
 * Show/hide loader
 * @param {*} state true for showing / false for hiding
 */
const showLoader = state => {
  // document.querySelector('.progress-bar').hidden = !state
  document.querySelector('.loader').hidden = !state
}