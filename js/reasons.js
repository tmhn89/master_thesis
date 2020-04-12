const reasonList = () => {
  var data          = [],
      filteredData  = [],
      filter        = {}

  const self = wrapperId => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }

    self.printSummary(wrapperId, self.getFilteredData())
    filterDispatch
      .on('filterChanged.reasons', () => {
        self.printSummary(wrapperId, self.getFilteredData())
      })

    // add interaction
  }

  /**
   * Get the stats of filtered dataset
   */
  self.printSummary = (wrapperId, data) => {
    if (data.length === 0) {
      document.getElementById(wrapperId).innerHTML = '<div>No data available</div>'
      return
    }

    // generate summary
    const violations = data.reduce(
      (total, current) => total + parseInt(current.occurrence),
      0
    )

    const locations = [...new Set(data.map(d => d.coords))].length

    const locationGroups = d3.group(data, d => d.coords)
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
      .rollups(data, v => v.length, d => d.reason)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topNum)

    let topReasonHtml = topReasons.map(d => `
      <li class="reason__item">
        <div class="reason__select">
          <input type="checkbox"/>
        </div>
        <div class="reason__label">
          <span class="reason__id" style="background-color: ${getReasonGroup(d[0]).color2}">${d[0]}</span>
          <span class="reason__text">${reasonListEn[d[0].slice(0, 4)]}</span>
        </div>
        <div class="reason__count">${d[1]}</div>
      </li>
    `)
      .join('')

    let template = `
      <div>${violations} violations across ${locations} locations</div>
      <div><b>${getAddress(mostViolation.coords)}</b> has the most violation (${mostViolation.total})</div>
      <div>Top ${topNum} reasons</div>
      <ul class="reason__list">${topReasonHtml}</ul>
    `
    document.getElementById(wrapperId).innerHTML = template
  }

  /**
   * Remove the reason filter to display all reasons for this component
   */
  self.getFilter = () => {
    let filter = JSON.parse(JSON.stringify(globalFilter))
    delete filter.reasons
    return filter
  }

  self.getFilteredData = () => {
    let filter = self.getFilter()
    return filterData(data, filter)
  }

  // data-setter
  self.data = value => {
    if (!value) { return data }
    data = value
    return self
  }

  return self
}
