const reasonList = () => {
  var data           = [],
      formattedData  = [],
      selected       = []

  const self = wrapperId => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }

    self.printSummary(wrapperId, formattedData)
    filterDispatch
      .on('filterChanged.reasons', () => {
        self.formatData()
        self.printSummary(wrapperId, formattedData)
      })

    // add interaction
  }

  /**
   * Get the stats of filtered dataset
   */
  self.printSummary = (wrapperId, reasonData) => {
    if (reasonData.length === 0) {
      document.getElementById(wrapperId).innerHTML = '<div>No data available</div>'
      return
    }

    // generate summary
    const violations = reasonData.reduce(
      (total, current) => total + parseInt(current.occurrence),
      0
    )

    const locations = [...new Set(reasonData.map(d => d.coords))].length

    const locationGroups = d3.group(reasonData, d => d.coords)
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
      .rollups(reasonData, v => v.length, d => d.reason)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topNum)

    let topReasonHtml = topReasons.map(d => `
      <li class="reason__item">
        <div class="reason__select">
          <input class="reason__checkbox" type="checkbox" data-id="${d[0]}"/>
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
    self.setInteraction()
  }

  self.setInteraction = () => {
    // set checked state
    let selectedReasonBoxes = d3
      .selectAll('.reason__checkbox')
      .nodes()
      .filter(d => { return globalFilter.reason.indexOf(d.getAttribute('data-id')) > -1 })

    selectedReasonBoxes.forEach(d => {
      d3.select(d).property('checked', true)
    })

    // on checkbox click, update filters
    // @todo: has a button for user to decide when they are done filtering
    d3.selectAll('.reason__checkbox')
      .on('change', () => {
        let checkedReasons = d3
          .selectAll('.reason__checkbox:checked')
          .nodes()
          .map(d => d.getAttribute('data-id'))

        filterDispatch.call('filter', this, { reason: checkedReasons })
      })
  }

  /**
   * Remove the reason filter to display all reasons for this component
   */
  self.getFilter = () => {
    let filter = Object.assign({}, globalFilter)
    delete filter.reason
    return filter
  }

  self.formatData = () => {
    let filter = self.getFilter()
    formattedData = filterData(data, filter)
  }

  // data-setter
  self.data = value => {
    if (!value) { return data }
    data = value
    self.formatData()
    return self
  }

  return self
}
