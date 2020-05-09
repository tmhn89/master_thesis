
const ZOOM_INTERACTION_LEVEL      = 14
const SNAPPING_ANIMATION_DURATION = 300
const EXPLORER_DEFAULT_RADIUS     = 350 // meter
const EXPLORER_MAX_RADIUS         = 1000 // meter

var isFirstLoad = true

var currentLang   = 'fi'
var addressBook   = []
var reasonGroups  = []

var filterDispatch = d3.dispatch('filter', 'filterChanged')
var infoDispatch = d3.dispatch('locationSelected', 'locationDeselected')
var langDispatch = d3.dispatch('langChanged')

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
    renderGroupLegend()

    periodSelector = periodSelector.data(data[2])
    periodSelector('periodSelector')

    reasonSelector = reasonSelector.data(data[2])
    reasonSelector('stats')

    // pass data to bubble map
    maps = maps.data(data[2])
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
      infoBox.showBox()
    })

    infoDispatch.on('locationDeselected', data => {
      infoBox.hideBox()
    })

    langDispatch.on('langChanged', () => {
      renderGroupLegend()
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

const hideInfoBox = () => {
  if (!infoBox) { return }
  infoBox.hideBox()
  if (maps.isExplorerShowing()) {
    maps.toggleExplorerState()
  }
}

const changeLanguage = () => {
  currentLang = currentLang === 'en'
    ? 'fi'
    : 'en'

  // change button text
  d3.select('.control__button--lang .button__text .text__lang')
    .html(currentLang.toUpperCase())

  // change violation text
  langDispatch.call('langChanged')
}

/**
 * Handle when visibility control of a section clicked
 */
const changeSectionVisibility = event => {
  event
    .target
    .parentNode
    .parentNode
    .parentNode
    .classList
    .toggle('section--off')

  adaptReasonListLength()
}

const adaptReasonListLength = () => {
  const reasonListTop = document
    .querySelector('.reason__list')
    .getBoundingClientRect()
    .top
  const adaptedHeight = window.innerHeight - reasonListTop - 24

  d3
    .select('.reason__list')
    .style('height', `${adaptedHeight}px`)
}

const changeSidebarVisibility = () => {
  d3
    .select('.left-sidebar')
    .node()
    .classList
    .toggle('left-sidebar--off')
}

const hideLegendBox = () => {
  d3
    .select('.group-legend__trigger')
    .style('opacity', 1)

  d3
    .select('.group-legend')
    .node()
    .classList
    .add('group-legend--off')
}

const showLegendBox = () => {
  d3
    .select('.group-legend__trigger')
    .style('opacity', 0)

  d3
    .select('.group-legend')
    .node()
    .classList
    .remove('group-legend--off')
}

const renderGroupLegend = () => {
  let colorItemHtml = `
    <li class="group__item">
      <div></div>
      <div class="group__header">Violation group</div>
      <div class="group__header">Code starts with</div>
    <li>
  `

  colorItemHtml += reasonGroups.map(group => `
    <li class="group__item">
      <div class="group__color" style="background-color: ${group.color2}"></div>
      <div class="group__name">
        ${currentLang === 'en' ? group.name_en : group.name_fi}
      </div>
      <div class="group__ids">
        ${group.ids.join(', ')}
      </div>
    </li>
  `)
  .join('')

  d3
    .select('.section--group .group__list')
    .html(colorItemHtml)
}

const showIntro = () => {
  const bodyNode = d3.select('body').node()
  bodyNode.classList.add('show-intro')

  const handleIntroExit = () => {
    bodyNode.classList.remove('show-intro')
  }

  const driver = new Driver({
    onReset: handleIntroExit
  })
  driver.defineSteps(getIntro())
  driver.start()
}

const getIntro = () => {
  return [
    {
      element: '.section--period',
      popover: {
        title: 'Timeline',
        description: `
          <p>Display the total violation for each month.</p>
          <p>Click on a column to <b>select a month</b>, or drag to <b>select multiple consecutive months</b>.</p>
          <p>The summary below and the violations on the map will be shown accordingly</p>
        `,
        position: 'right'
      }
    },
    {
      element: '.section--reasons',
      popover: {
        title: 'Reason list',
        description: `
          <p>Display all reasons leading to parking violation in the selected period, sorted by total occurrence.</p>
          <p><b>Filter the reason</b> displaying on the map by clicking its corresponding checkbox.</p>
          <p>Deselect all checkboxes to <b>show all reasons</b>.</p>
          <p>Click on the help icon <i class="mdi mdi-help-circle"></i> to <b>see how the reasons are groupped and colored</b>.</p>
        `,
        position: 'right'
      }
    },
    {
      element: '.control__button--explorer',
      popover: {
        title: 'Explorer tool',
        description: `
          <p><b>Trigger explorer tool</b> by clicking this button, then click on the map to setup an as-the-crow-flies exploring area.</p>
          <p><b>Change the size of the exploring area</b> by draging its border.</p>
        `,
        position: 'left'
      }
    },
    {
      element: '.control__button--lang',
      popover: {
        title: 'Language switcher',
        description: `
          <p><b>Change the language of violation reasons</b> by clicking this button. English and Finnish are available</p>
        `,
        position: 'left'
      }
    },
    {
      element: '.title__guide-button',
      popover: {
        title: 'Info button',
        description: `
          <p>In case you forgot what you just read and want to see the introduction again, <b>click this button</b></p>
        `,
        position: 'right'
      }
    }
  ]
}

d3
  .select('.title__guide-button')
  .on('click', () => {
    setTimeout(showIntro, 100)
  })