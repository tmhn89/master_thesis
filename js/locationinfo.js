const locationInfo = () => {
  var wrapper     = null,
      data        = null,
      width       = 0,
      height      = 0,
      margin      = { right: 48 },
      padding     = { x: 12, y: 24 },
      spacing     = 6, // spacing between two lines of an item
      barHeight   = 6,
      fontSize    = 13,
      infoArea    = null

  const self = wrapperId => {
    wrapper = d3.select(`#${wrapperId}`)
    width = wrapper.node().getBoundingClientRect().width
    height = wrapper.node().getBoundingClientRect().height

    // clear content when filter changed
    filterDispatch
      .on('filterChanged.locationInfo', () => {
        d3.selectAll(`#${wrapperId} *`).remove()
      })
  }

  self.drawInfoChart = data => {
    // data sample
    // {
    //  coords: "60.1834143 24.9624562"
    //  reasons: {1302: 7, 1501: 110, 2001: 1, 2200: 9, 1302 2001: 1, 2103 2104: 1, 2104 2103: 1}
    //  total: 130
    // }

    d3.select('#infoSvg').remove()
    wrapper
      .append('svg')
      .attr('id', 'infoSvg')
      .attr('width', width)
      .attr('height', height)

    infoArea = d3.select('#infoSvg')
      .append('g')
      .attr('transform', `translate(0, ${padding.y})`)

    const reasons = Object.keys(data.reasons)
    // setup scale
    var scale = {}
    scale.x = d3.scaleLinear()
      .domain([0, data.total])
      .range([padding.x, width - padding.x - margin.right])

    const lineHeight = barHeight + spacing + fontSize * 1.25
    scale.y = d3.scaleBand()
      .domain(reasons)
      .range([0, reasons.length * lineHeight])

    // grey placeholder
    infoArea.selectAll('rect.location-info__placeholder')
      .data(reasons)
      .enter()
      .append('rect')
        .attr('class', 'location-info__placeholder')
        .attr('x', d => scale.x(0))
        .attr('y', d => scale.y(d))
        .attr('width', width - padding.x - margin.right)
        .attr('height', barHeight)
        .attr('fill', '#999')
        .attr('fill-opacity', '0.3')


    // data with color and length as the violation count
    infoArea.selectAll('rect.location-info__data')
      .data(reasons)
      .enter()
      .append('rect')
        .attr('class', 'location-info__data')
        .attr('x', d => scale.x(0))
        .attr('y', d => scale.y(d))
        .attr('width', 0)
        .attr('height', barHeight)
        .attr('fill', d => {
          const colors = d.split(' ')
            .map(reasonId => getReasonGroup(reasonId).color2)
          return chroma.average(colors, 'rgb')
        })
        .attr('fill-opacity', '0.5')
        .transition()
          .attr('width', d => scale.x(data.reasons[d]))
        .duration(750)

    // text - reason code and name
    // data with color and length as the violation count
    infoArea.selectAll('text.location-info__text-reason')
      .data(reasons)
      .enter()
      .append('text')
        .attr('class', 'location-info__text-reason')
        .attr('x', d => scale.x(0))
        .attr('y', d => scale.y(d) - spacing)
        .attr('font-size', fontSize)
        .attr('fill', '#999')
        .text(d => `${d} - ${reasonListEn[d.slice(0, 4)]}`)

    // text - violation count
    infoArea.selectAll('text.location-info__text-count')
      .data(reasons)
      .enter()
      .append('text')
        .attr('class', 'location-info__text-count')
        .attr('x', width - padding.x)
        .attr('y', d => scale.y(d) + spacing)
        .attr('font-size', fontSize)
        .attr('text-anchor', 'end')
        .attr('fill', '#999')
        .text(d => data.reasons[d])
  }

  self.printSummary = () => {
    let template = `
      <div>${getAddress(data.coords)}</div>
      <div>Total violations: ${data.total}</div>
    `

    wrapper.node().innerHTML = template
  }

  self.data = value => {
    if (!value) { return data }
    data = value
    self.printSummary(data)
    self.drawInfoChart(data)
    return self
  }

  return self
}