const reasonList = () => {
  var wrapper        = null,
      data           = [],
      formattedData  = [],
      topReasonNum   = 10

  const self = wrapperId => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }

    wrapper = document.getElementById(wrapperId)

    self.printSummary(wrapper, formattedData)
    filterDispatch
      .on('filterChanged.reasons', () => {
        self.formatData()
        self.printSummary(wrapper, formattedData)
      })

    // add interaction
  }

  /**
   * Get the stats of filtered dataset
   */
  self.printSummary = (wrapper, reasonData) => {
    if (reasonData.length === 0) {
      wrapper.innerHTML = '<div>No data available</div>'
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

    let topReasons = d3
      .rollups(reasonData, v => v.length, d => d.reason)
      .sort((a, b) => b[1] - a[1])

    if (topReasonNum > 0) {
      topReasons = topReasons.slice(0, topReasonNum)
    }

    let topReasonHtml = topReasons.map(d => `
      <li class="reason__item">
        <div class="reason__select">
          <input class="reason__checkbox" type="checkbox" data-id="${d[0]}"/>
        </div>
        <div class="reason__label">
          <span class="reason__id" style="background-color: ${getReasonGroup(d[0]).color2}">${d[0]}</span>
          <span class="reason__text">${getReasonText(d[0])}</span>
        </div>
        <div class="reason__count">${d[1]}</div>
      </li>
    `)
      .join('')

    // <div>${violations} violations across ${locations} locations</div>
    // <div><b>${getAddress(mostViolation.coords)}</b> has the most violation (${mostViolation.total})</div>
    let template = `
      <div class="reason__top">
        <div class="reason__title">Reasons:</div>
        <div class="reason__button-wrap">
          <button class="reason__button ${topReasonNum === 10 ? 'reason__button--active' : ''}" data-show="10">Top 10</button>
          <button class="reason__button ${topReasonNum === 25 ? 'reason__button--active' : ''}" data-show="25">Top 25</button>
          <button class="reason__button ${topReasonNum === 0 ? 'reason__button--active' : ''}" data-show="0">All</button>
        </div>
      </div>
      <ul class="reason__list">${topReasonHtml}</ul>
    `
    wrapper.innerHTML = template

    // update summary above timeline
    d3.select('.period__total b')
      .html(violations)
    d3.select('.period__time')
      .html(formatTime(globalFilter.period[0]))

    self.setInteraction()
  }

  self.setInteraction = () => {
    // set checked state
    let selectedReasonBoxes = d3
      .selectAll('.reason__checkbox')
      .nodes()
      .filter(d => { return globalFilter.reasons.indexOf(d.getAttribute('data-id')) > -1 })

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

        filterDispatch.call('filter', this, { reasons: checkedReasons })
      })

    // top reasons button
    d3.selectAll('.reason__button')
      .on('click', () => {
        // remove active state of other button
        d3.selectAll('.reason__button')
          .nodes()
          .forEach(el => el.classList.remove('reason__button--active'))
        // add active state for clicked button
        d3.event
          .target
          .classList
          .add('reason__button--active')
        // update control variable
        topReasonNum = parseInt(d3.event.target.getAttribute('data-show'))
        self.printSummary(wrapper, formattedData)
      })
  }

  /**
   * Remove the reason filter to display all reasons for this component
   */
  self.getFilter = () => {
    let filter = Object.assign({}, globalFilter)
    delete filter.reasons
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
