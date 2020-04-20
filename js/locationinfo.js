const locationInfo = () => {
  var wrapper     = null,
      data        = null,
      width       = 0,
      height      = 0,
      margin      = { left: 16, right: 64 },
      padding     = { x: 16, y: 24 },
      spacing     = 6, // spacing between two lines of an item
      barHeight   = 6,
      fontSize    = 12,
      infoArea    = null

  const self = wrapperId => {
    wrapper = d3.select(`#${wrapperId}`)

    if (!wrapper.node()) { return }

    width = wrapper.node().getBoundingClientRect().width
    height = wrapper.node().getBoundingClientRect().height

    // clear content when filter changed
    filterDispatch
      .on('filterChanged.locationInfo', () => {
        self.hideBox()
        d3.selectAll(`#${wrapperId} .info__content *`).remove()
      })
  }

  self.drawInfoChart = data => {
    // data sample
    // {
    //  coords: "60.1834143 24.9624562"
    //  reasons: {1302: 7, 1501: 110, 2001: 1, 2200: 9, 1302 2001: 1, 2103 2104: 1, 2104 2103: 1}
    //  total: 130
    // }
    let summarizedData = {}
    switch (data.type) {
      case 'area':
        /// summarize data here
        summarizedData = {
          reasons: {},
          total: data.total
        }

        data.markers.forEach(marker => {
          Object.keys(marker.reasons)
            .forEach(id => {
              if (!summarizedData.reasons[id]) {
                summarizedData.reasons[id] = 0
              }
              summarizedData.reasons[id] += marker.reasons[id]
            })
        })
        break
      case 'point':
        summarizedData = data.markers[0]
        break
      default:
        break
    }

    d3.select('#infoSvg').remove()
    wrapper
      .select('.info__content')
      .append('svg')
      .attr('id', 'infoSvg')
      .attr('width', width)
      .attr('height', height)

    infoArea = d3.select('#infoSvg')
      .append('g')
      .attr('transform', `translate(0, ${padding.y})`)

    const reasons = Object.keys(summarizedData.reasons)
      .map(id => {
        return {
          id: id,
          total: summarizedData.reasons[id]
        }
      })
      .sort((a, b) => b.total - a.total)

    // setup scale
    var scale = {}
    scale.x = d3.scaleLinear()
      .domain([0, summarizedData.total])
      .range([padding.x, width - padding.x - margin.left - margin.right])

    const lineHeight = barHeight + spacing + fontSize * 1.75
    scale.y = d3.scaleBand()
      .domain(reasons.map(reason => reason.id))
      .range([0, reasons.length * lineHeight])

    // grey placeholder
    infoArea.selectAll('rect.location-info__placeholder')
      .data(reasons)
      .enter()
      .append('rect')
        .attr('class', 'location-info__placeholder')
        .attr('x', d => scale.x(0) + margin.left)
        .attr('y', d => scale.y(d.id))
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
        .attr('x', d => scale.x(0) + margin.left)
        .attr('y', d => scale.y(d.id))
        .attr('width', 0)
        .attr('height', barHeight)
        .attr('fill', d => {
          const colors = d.id.split(' ')
            .map(reasonId => getReasonGroup(reasonId).color2)
          return chroma.average(colors, 'rgb')
        })
        .attr('fill-opacity', '1')
        .transition()
          .attr('width', d => scale.x(d.total))
        .duration(750)

    // text - reason code and name
    // data with color and length as the violation count
    infoArea.selectAll('text.location-info__text-reason')
      .data(reasons)
      .enter()
      .append('text')
        .attr('class', 'location-info__text-reason')
        .attr('x', d => scale.x(0) + margin.left)
        .attr('y', d => scale.y(d.id) - spacing)
        .attr('font-size', fontSize)
        .attr('fill', '#8fa799')
        .text(d => `${d.id} - ${getReasonText(d.id)}`)

    // text - violation count
    infoArea.selectAll('text.location-info__text-count')
      .data(reasons)
      .enter()
      .append('text')
        .attr('class', 'location-info__text-count')
        .attr('x', scale.x(0) + margin.left - padding.x * 2)
        .attr('y', d => scale.y(d.id) + spacing)
        .attr('font-size', fontSize + 2)
        // .attr('text-anchor', 'end')
        .attr('fill', '#666')
        .text(d => d.total)
  }

  self.printSummary = () => {
    let template = ''

    switch (data.type) {
      case 'area':
        template = `
          <div class="info__summary">
            <div class="summary__field">
              <div class="field__name">Area radius</div>
              <div class="field__value">${parseInt(data.radius)} m</div>
            </div>
            <div class="summary__field">
              <div class="field__name">Total violations</div>
              <div class="field__value">${data.total}</div>
            </div>
          </div>
        `
        break
      case 'point':
        template = `
          <div class="info__summary">
            <div class="summary__field">
              <div class="field__name">Address</div>
              <div class="field__value">${getAddress(data.markers[0].coords)}</div>
            </div>
            <div class="summary__field">
              <div class="field__name">Total violations</div>
              <div class="field__value">${data.markers[0].total}</div>
            </div>
          </div>
        `
        break
      default:
        break
    }

    wrapper.select('.info__content').node().innerHTML = template
  }

  self.showBox = () => {
    wrapper.node().style.right = '36px'
  }

  self.hideBox = () => {
    wrapper.node().style.right = '-500px'
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