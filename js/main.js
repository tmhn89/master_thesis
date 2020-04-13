
const ZOOM_INTERACTION_LEVEL      = 14
const SNAPPING_ANIMATION_DURATION = 300

var addressBook   = []
var reasonGroups  = []

var filterDispatch = d3.dispatch('filter', 'filterChanged')
var infoDispatch = d3.dispatch('locationSelected')

var maps            = bubbleMaps()
var periodSelector  = timeline()
var reasonSelector  = reasonList()
var infoBox = locationInfo()
infoBox('locationInfo')

var globalFilter = {
  period: [parseTime(2019, 11), parseTime(2019, 11)],
  reasons: [],
  bound: null
}

Promise.all([fetchAddressLocation(), fetchReasonGroups(), fetchViolationData()])
  .then(data => {
    // save default global variables
    addressBook   = data[0]
    reasonGroups  = data[1]

    periodSelector = periodSelector.data(data[2])
    periodSelector('periodSelector')

    reasonSelector = reasonSelector.data(data[2])
    reasonSelector('stats')

    // pass data to bubble map
    maps = maps.data(data[2])
    // render the viz
    maps('bubblemaps')


    filterDispatch.on('filter', data => {
      showLoader(true) // loader will be hidden when drawing complete

      // update the filter, then trigger filter change event
      Object.assign(globalFilter, data)
      setTimeout(() => {
        filterDispatch.call('filterChanged')
      }, 100)
    })

    infoDispatch.on('locationSelected', data => {
      infoBox = infoBox.data(data)
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