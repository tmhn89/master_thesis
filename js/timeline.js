const timeline = () => {
  var wrapper       = null,
      data          = [],
      formattedData = [],
      chartArea     = null,
      chartDrawn    = false,
      selected      = [parseTime(2019, 11), parseTime(2019, 11)],
      width         = 800,
      height        = 200,
      margin        = { left: 64, top: 32 },
      scale         = { x: null, y: null },
      axis          = { x: null, y: null },
      d3Area        = null,
      barWidth      = 16

  const self = (wrapperId) => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }
    // set wrapper size
    wrapper = d3.select(`#${wrapperId}`)
    width = wrapper.node().getBoundingClientRect().width
    height = wrapper.node().getBoundingClientRect().height

    self.draw()
    filterDispatch
      .on('filterChanged.period', () => {
        self.formatData()
        self.draw()
      })
  }

  self.draw = () => {
    self.setupChart()
    self.drawChart()
    self.drawBrush()
  }

  self.setupChart = () => {
    // init SVG
    if (!chartDrawn) {
      // d3.select('#psSvg').remove()
      wrapper
        .append('svg')
        .attr('id', 'psSvg')
        .attr('width', width)
        .attr('height', height)

      // chart area to draw chart and brush on
      chartArea = d3.select('#psSvg')
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
    }

    const months = formattedData.map(d => parseTime(d.year, d.month))
    // scales
    scale.x = d3.scaleTime()
      .domain(d3.extent(months))
      // .domain([d3.timeMonth.offset(d3.min(months), -1), d3.timeMonth.offset(d3.max(months), +1)])
      .range([0, width - margin.left * 2])
    scale.y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => d.violations)]) // 20000 for multiple reasons, max 2000 for single reason
      .range([height - margin.top * 2, 0])
      .nice()
    // axis
    axis.x = d3.axisBottom(scale.x)
      .ticks(d3.timeMonth, 1)
      .tickFormat(d3.timeFormat('%b %Y'))
    axis.y = d3.axisLeft(scale.y)

    d3.select('.axis.axis--x').remove()
    chartArea.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0, ${height - margin.top * 2})`)
      .call(axis.x)
        .selectAll('text')
        .attr('dy', '15')
        .attr('transform', 'rotate(25)')

    d3.select('.axis.axis--y').remove()
    chartArea.append('g')
      .attr('class', 'axis axis--y')
      .call(axis.y)

    d3Area = d3.area()
      .x(d => scale.x(parseTime(d.year, d.month)))
      .y0(scale.y(0))
      .y1(d => scale.y(d.violations))
      .curve(d3.curveMonotoneX)
  }

  self.drawChart = () => {
    if (chartDrawn) {
      self.updateChart()
      return
    }

    // chartArea.selectAll('rect')
    //   .data(formattedData)
    //   .enter()
    //   .append('rect')
    //     .attr('x', d => scale.x(parseTime(d.year, d.month)))
    //     .attr('y', d => scale.y(d.violations) + margin.top * 2)
    //     .attr('width', barWidth)
    //     .attr('height', d => height - scale.y(d.violations) - margin.top * 2)
    //     .attr('fill', '#e67e22')
    //     .attr('fill-opacity', '0.7')
    //     .attr('transform', `translate(${-barWidth / 2}, ${-margin.top * 2})`)

    chartArea.append('path')
      .datum(formattedData)
      .attr('fill', '#999')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('d', d3Area)

    chartDrawn = true
  }

  self.updateChart = () => {
    // chartArea.selectAll('rect')
    //   .data(formattedData)
    //   .transition()
    //     .attr('y', d => scale.y(d.violations) + margin.top * 2)
    //     .attr('height', d => { console.log(d); return height - scale.y(d.violations) - margin.top * 2 })
    //   .duration(1000)
    //   .delay(1000)

    chartArea.select('path')
      .datum(formattedData)
      .transition()
        .attr('d', d3Area)
      .duration(1000)
      .delay(750)

    // chartArea.selectAll('.timeline__detail')
    //   .data(formattedData)
    //   .enter()
    //   .append('circle')
    //     .attr('class', 'timeline__detail')
    //     .attr('fill', 'green')
    //     .attr('r', 4)
    //     .attr('cx', d => scale.x(parseTime(d.year, d.month)))
    //     .attr('cy', scale.y(0))
    //   .transition()
    //     .attr('cy', d => scale.y(d.violations))
    //     .duration(1000)
  }

  self.drawBrush = () => {
    // init brush
    const brush = d3.brushX()
      .extent([[0, 0], [width - margin.left * 2, height - margin.top * 2]])

      .on('brush', function () {
        // selection as position on chart
        const selection = d3.event.selection
        // update bursh data
        d3.select(this).call(self.brushHandle, selection)
        showLoader(true)
      })
      .on('end', function () {
        // snap the selection to month position after brush end
        if (!d3.event.sourceEvent) return
        // selection as position on chart
        const rawSelection = d3.event.selection
        if (!rawSelection) return
        // round the selected to the closest month
        // then map the selection as period start & end
        selected = rawSelection
          .map(scale.x.invert)
          .map(d3.timeMonth.round)

        d3.select(this)
          .transition()
          // .duration(SNAPPING_ANIMATION_DURATION)
          .on('end', () => { filterDispatch.call('filter', this, { period: selected }) })
          .call(d3.event.target.move, [
            scale.x(selected[0]) - barWidth / 2,
            scale.x(selected[1]) + barWidth / 2
          ])
      })

    // append brush to chart area
    d3.selectAll('.timeline__brush').remove()
    chartArea.append('g')
      .attr('class', 'timeline__brush')
      .call(brush)
      .call(brush.move,
        [
          scale.x(selected[0]) - barWidth / 2,
          scale.x(selected[1]) + barWidth / 2
        ])
    // override default behaviour - clicking outside of the selected area
    // will select a small piece there rather than deselecting everything
    // https://bl.ocks.org/mbostock/6498000
    chartArea.selectAll('.overlay')
      .each(d => { d.type = 'selection' })
      .on('mousedown touchstart', brushcentered)

    function brushcentered() {
      var dx = barWidth, // Use a fixed width when recentering.
          cx = d3.mouse(this)[0],
          x0 = cx - dx / 2,
          x1 = cx + dx / 2;
      d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
    }
  }

  self.brushHandle = (g, selection) => {
    // brush handle
    // from https://observablehq.com/@sarah37/snapping-range-slider-with-d3-brush
    var brushResizePath = function(d) {
      var e = +(d.type == "e"),
          x = e ? 1 : -1,
          y = height / 2;
      return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
        "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
        "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
    }

    // append brush handle to brush area
    return g
      .selectAll('.brush__handle')
      .data([{type: 'w'}, {type: 'e'}])
      .join(
        enter => enter.append('path')
          .attr('class', 'brush__handle')
          .attr('fill', '#d4d4d4')
          .attr('fill-opacity', 0.2)
          .attr('stroke', '#59c154')
          .attr('stroke-width', 1)
          .attr('cursor', 'ew-resize')
          .attr('d', brushResizePath)
      )
        .attr('display', selection === null ? 'none' : null)
        .attr('transform', selection === null
          ? null
          : (d, i) => `translate(${selection[i]}, -${(height) / 2 - margin.top})`
        )
  }

  // data-setter
  self.data = value => {
    if (!value) { return data }
    data = value
    self.formatData()
    return self
  }

  /**
   * Remove the period filter to display all periods for this component
   */
  self.getFilter = () => {
    let filter = Object.assign({}, globalFilter)
    delete filter.period
    return filter
  }

  /**
   * Get monthly summary of the whole dataset to draw the timeline
   */
  self.formatData = () => {
    let filteredData = filterData(data, self.getFilter())

    let groups = d3.group(filteredData, d => formatTime(parseTime(d.year, d.month)))
    let result = []

    Array.from(groups.keys())
      // .sort((a,b) => parseTime(a.year, a.month) - parseTime(b.year, b.month))
      .forEach(period => {
        let periodGroup = groups.get(period)
        let violations = Array.from(periodGroup.values())
          .reduce((a, b) => a + parseInt(b.occurrence), 0)

        result.push({
          year: periodGroup[0].year,
          month: periodGroup[0].month,
          locations: periodGroup.length,
          violations: violations
        })
      })

    formattedData = result
      .sort((a,b) => parseTime(a.year, a.month) - parseTime(b.year, b.month))
  }

  self.value = () => {
    return selected
  }

  self.on = (eventName, callback) => {
    switch (eventName) {
      case 'changed':
        d3.select('#psSvg').on('changed', () => { callback(d3.event) })
        break
      default:
        console.warn('event not registered')
        break
    }
    return self
  }

  return self
}