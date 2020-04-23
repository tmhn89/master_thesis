// group violation by month, then location
const groupByMonth = data => {
  return d3.group(data, d => d.month, d => d.coords)
}

// group violation by location only
const groupByLocation = data => {
  return d3.group(data, d => d.coords)
}

// group violation by occurrence per location [{coords, occurrence, count-each-reason}]
const groupByOccurrence = data => {
  // group by location first
  let groups = d3.group(data, d => d.coords)
  let result = []

  for (const [key, value] of groups.entries()) {
    let item = {
      coords: key,
      reasons: {},
      total: 0
    }
    // collect reason
    value.forEach(record => {
      if (item.reasons[record.reason]) {
        item.reasons[record.reason] += parseInt(record.occurrence)
      } else {
        item.reasons[record.reason] = parseInt(record.occurrence)
      }
    })
    // add up the occurrence
    item.total = value.reduce((total, current) => total + parseInt(current.occurrence), 0)

    result.push(item)
  }

  return result
}

/**
 * Translate coordinates into point, based on input projection
 * Note that violation dataset has [lat lng] format, while d3 takes [lng lat] by default
 * @param {Array} coords [lat lng]
 */
const getProjectedPoint = (coords, projection) => {
  if (!coords) return projection([0, 0])
  return projection([coords.split(' ')[1], coords.split(' ')[0]])
}

const getMarkerRadius = (occurrence, zoom, period) => {
  // const periodLength = period[1] - period[0] + 1
  const periodLength = d3.timeMonth.count(...period) + 1
  const monthlyScale = d3.scaleLinear()
    // .domain([0, 160])
    .domain([0, 240 * periodLength]) // assume that a month has maximum 240 violations, multiply by number of months in period
    .range([1, (zoom - 5) * 7])
  // make marker bigger on close zoom
  let addition = zoom > ZOOM_INTERACTION_LEVEL ? (zoom - ZOOM_INTERACTION_LEVEL + 2) : 0
  return monthlyScale(occurrence) + addition
}

/**
 * Find the address text of given coords
 * @param {String} coords - 'lat, lng'
 */
const getAddress = coords => {
  let location = addressBook.find(d => d.coords === coords)
  return location ? location.address : 'No specific address'
}

/**
 * Find the reason group of a specified reason id
 * Reason group object contains group name in EN/FI & color
 * @param {String} reasonId
 */
const getReasonGroup = reasonId => {
  return reasonGroups.find(group => {
    return group.ids.indexOf(reasonId.substr(0, 2)) > -1
  })
}

/**
 * Get the text for specified reason id
 * Temporarily take just the first reason
 * @param {String} reasonId
 */
const getReasonText = (reasonId, lang) => {
  let langFile = reasonListFi

  if (!lang || lang === 'en') {
    let langFile = reasonListEn
  }

  let reasonText = langFile[reasonId.slice(0, 4)]
  return reasonText.replace(/^./, reasonText[0].toUpperCase())
}

/**
 * Get marker color by mixing the colors of its reason
 * @param {Object} marker
 */
const getMarkerColor = marker => {
  var colors = [],
      occurrences = []

  Object.keys(marker.reasons).forEach(reasonId => {
    colors.push(getReasonGroup(reasonId).color2)
    occurrences.push(marker.reasons[reasonId])
  })

  return chroma.average(colors, 'rgb', occurrences)
}

/**
 *
 * @param {*} data array of {coords, month, reason, occurrence}
 * @param {*} conditions month (array), reason (array)
 */
const filterData = (data, filter) => {
  if (!filter) { return data }

  let result = data
  if (filter.period) {
    result = result.filter(d =>
      d3.timeMonth.count(parseTime(d.year, d.month), filter.period[0]) <= 0
      && d3.timeMonth.count(parseTime(d.year, d.month), filter.period[1]) >= 0
    )
  }

  if (filter.reasons && filter.reasons.length > 0) {
    result = result.filter(d => filter.reasons.indexOf(d.reason) > -1)
  }

  // continue writing other conditions here
  return result
}

/**
 * parse time for calculation
 * @param {*} year
 * @param {*} month
 */
const parseTime = (year, month) => {
  return d3.timeParse('%Y-%m')(`${year}-${month}`)
}

/**
 * Format time for display
 * @param {*} date
 */
const formatTime = date => {
  return d3.timeFormat('%b %Y')(date)
}


const printLegend = (content) => {
  let legendEl = document.getElementById('locationInfo')

  let reasonHtml = Object.keys(content.reasons).map(id => `
    <li class="reason__item">
      <div class="reason__id">${id}</div>
      <div class="reason__count">${content.reasons[id]}</div>
    </li>
  `)
    .join('')

  let template = `
    <div>${getAddress(content.coords)}</div>
    <div>Total violations: ${content.total}</div>
    <div><ul>${reasonHtml}</ul></div>
  `

  legendEl.innerHTML = template
}
