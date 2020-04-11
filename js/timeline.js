const timeline = () => {
  var data      = [],
      chartArea = null,
      selected  = [parseTime(2019, 11), parseTime(2019, 11)],
      width     = 800,
      height    = 200,
      margin    = { left: 64, top: 32 },
      scale     = { x: null, y: null},
      axis      = { x: null, y: null},
      barWidth  = 10

  const self = (wrapperId) => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }
    // set wrapper size
    const wrapper = d3.select(`#${wrapperId}`)
    width = wrapper.node().getBoundingClientRect().width
    height = wrapper.node().getBoundingClientRect().height

    // init SVG
    d3.select('#psSvg').remove()
    var svg = wrapper
      .append('svg')
      .attr('id', 'psSvg')
      .attr('width', width)
      .attr('height', height)

    // @todo - recheck this when data from other year comes
    const months = data.map(d => parseTime(d.year, d.month))
    // scales
    scale.x = d3.scaleTime()
      .domain([d3.timeMonth.offset(d3.min(months), -1), d3.timeMonth.offset(d3.max(months), +1)])
      .range([0, width - margin.left * 2])
    scale.y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.violations)])
      .range([height - margin.top * 2, 0])
      .nice()
    // axis
    axis.x = d3.axisBottom(scale.x)
      .ticks(d3.timeMonth, 1)
      .tickFormat(d3.timeFormat('%b %Y'))
    axis.y = d3.axisLeft(scale.y)

    // chart area to draw chart and brush on
    chartArea = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    chartArea.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0, ${height - margin.top * 2})`)
      .call(axis.x)

    chartArea.append('g')
      .attr('class', 'axis axis--y')
      .call(axis.y)

    // draw chart and add the brush
    self.drawChart()
    self.drawBrush()

    // add event when value changed
    // var changeEvent = new Event('changed')
    // self.addEventListener('changed', e => console.log(e))
  }

  self.drawChart = () => {
    chartArea.selectAll()
      .data(data)
      .enter()
      .append('rect')
        .attr('x', d => scale.x(parseTime(d.year, d.month)))
        .attr('y', d => scale.y(d.violations) + margin.top * 2)
        .attr('height', d => height - scale.y(d.violations) - margin.top * 2)
        .attr('width', barWidth)
        .attr('fill', '#e67e22')
        .attr('fill-opacity', '0.7')
        .attr('transform', `translate(${-barWidth / 2}, ${-margin.top * 2})`)

    // var line = d3.line()
    //   .x(d => scale.x(d.month))
    //   .y(d => scale.y(d.violations))
    //   .curve(d3.curveMonotoneX)

    // chartArea.append('path')
    //   .datum(data)
    //   .attr('class', 'chart__line')
    //   .attr('d', line)
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

        console.log('selected', selected)

        d3.select(this)
          .transition()
          .duration(SNAPPING_ANIMATION_DURATION)
          .call(d3.event.target.move, [
            scale.x(selected[0]) - barWidth / 2,
            scale.x(selected[1]) + barWidth / 2
          ])

        d3.select('#psSvg').dispatch('changed', { detail: { period: selected }})
      })

    // append brush to chart area
    chartArea.append('g')
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
          .attr('fill-opacity', 0.4)
          .attr('stroke', '#aaa')
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
    return self
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

  self.value = () => {
    return selected
  }

  return self
}