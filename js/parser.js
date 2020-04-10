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

const getMarkerRadius = (occurrence, zoom) => {
  const monthlyScale = d3.scaleLinear()
    .domain([0, 160])
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
const filterData = (data, conditions) => {
  console.log(conditions)
  if (!conditions) { return data }

  let result = data
  if (conditions.period) {
    // result = data.filter(d => conditions.month.indexOf(parseInt(d.month)) > -1)
    result = data.filter(d =>
      parseInt(d.month) >= conditions.period[0]
      && parseInt(d.month) <= conditions.period[1]
    )
  }

  // continue writing other conditions here
  return result
}

const printLegend = (content) => {
  let legendEl = document.getElementById('legend')

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

/**
 * Get the stats of filtered dataset
 * @param {*} dataset
 */
const printSummary = dataset => {
  // generate summary
  const violations = dataset.reduce(
    (total, current) => total + parseInt(current.occurrence),
    0
  )

  const locations = [...new Set(dataset.map(d => d.coords))].length

  const locationGroups = d3.group(dataset, d => d.coords)
  console.log(locationGroups)
  const violationsByLocation = Array.from(locationGroups.entries())
    .map(row => {
      return {
        coords: row[0],
        total: d3.sum(row[1], d => d.occurrence)
       }
     })
  const mostViolation = d3.greatest(violationsByLocation, (a,b) => a.total - b.total)

  const topNum = 10
  let topReasons = d3
    .rollups(dataset, v => v.length, d => d.reason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topNum)

  let topReasonHtml = topReasons.map(d => `
    <li class="reason__item">
      <div class="reason__id">${d[0]} ${reasonListEn[d[0]]}:</div>
      <div class="reason__count">${d[1]}</div>
    </li>
  `)
    .join('')

  let template = `
    <div>${violations} violations across ${locations} locations</div>
    <div><b>${getAddress(mostViolation.coords)}</b> has the most violation (${mostViolation.total})</div>
    <div>Top ${topNum} reasons</div>
    <ul>${topReasonHtml}</ul>
  `
  document.getElementById('stats').innerHTML = template
}

/**
 * Get monthly summary of the whole dataset to draw the timeline
 */
getDatasetMonthlySummary = dataset => {
  let groups = d3.group(dataset, d => d.month)
  console.log(groups)
  let result = []

  Array.from(groups.keys())
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(month => {
      let locations = groups.get(`${month}`).length
      let violations = Array.from(groups.get(`${month}`).values())
        .reduce((a, b) => a + parseInt(b.occurrence), 0)

      result.push({
        month: month,
        locations: locations,
        violations: violations
      })
    })

  return result
}