const bubbleMaps = () => {
  var width             = 800,
      height            = 600,
      center            = [24.937753465964533, 60.177494774748794],
      projection        = d3.geoMercator(),
      basemap           = null,
      svg               = null,
      data              = null,
      formattedData     = []

  // constructor
  const self = (wrapperId) => {
    if (!wrapperId) {
      console.warn('no wrapper, no place to draw. mwap mwap mwa')
      return
    }

    d3.select(`#${wrapperId}`)
      .style('width', `100%`)
      .style('height', `100%`)

    // draw base map
    mapboxgl.accessToken = 'pk.eyJ1IjoidG1objg5IiwiYSI6ImNqdXpsc3F6ODA5bzgzem51Nzl5NjRsenEifQ.sjP_xZpzqDltxdC63ku_zQ'

    basemap = new mapboxgl.Map({
      container: wrapperId, // container id
      style: 'mapbox://styles/mapbox/light-v10',
      center: center,
      zoom: 12,
      minZoom: 11
    })

    basemap.on('load', () => {
      // set map and map-related component dimensions
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight
      // generate marker list
      self.formatData()

      // start listen to global filter
      filterDispatch
        .on('filterChanged', () => {
          self.formatData()
          self.draw()
        })
    })

    basemap.on('idle', () => {
      self.draw()
    })

    basemap.on('move', () => {
      // self.drawRegionMap()

      // only redraw canvas on low zoom level when less than 3 months selected
      let periodLength = d3.timeMonth.count(...filter.period) + 1  // months
      if (periodLength >= 3 && basemap.getZoom() < ZOOM_INTERACTION_LEVEL) {
        self.clear()
        return
      }
      // only draw on canvas when map move
      d3.select('#d3Svg').remove()
      self.drawCanvas(formattedData)
    })

    basemap.on('resize', () => {
      // set map-related component dimension again
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight
      self.draw()
    })
  }

  self.draw = () => {
    showLoader(true)
    self.drawLegend()
    self.drawCanvas(formattedData)
    // draw only markers visible on map when zoom level is greater than 14
    if (basemap.getZoom() >= ZOOM_INTERACTION_LEVEL) {
      self.drawSvg(formattedData)
    }
    showLoader(false)
  }

  self.drawCanvas = markers => {
    self.setupProjection()
    const filter = self.getFilter()

    if (!document.getElementById('d3Canvas')) {
      d3.select(basemap.getCanvasContainer())
        .append('canvas')
        .attr('id', 'd3Canvas')
        .attr('width', width)
        .attr('height', height)
    }

    // get context and clear the canvas
    var context = d3.select('#d3Canvas').node().getContext('2d')
    context.clearRect(0, 0, width, height)

    markers.forEach(marker => {
      let x = getProjectedPoint(marker.coords, projection)[0]
      let y = getProjectedPoint(marker.coords, projection)[1]
      let radius = getMarkerRadius(marker.total, basemap.getZoom(), filter.period)
      // iterate marker list and draw
      context.strokeStyle = getMarkerColor(marker)
      context.fillStyle = chroma(getMarkerColor(marker)).alpha(0.5)

      context.lineWidth = 2

      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI, true)
      context.fill();
      context.closePath()
    })
  }

  /**
   * draw invisible svg markers on top of canvas for interaction
   */
  self.drawSvg = markers => {
    self.setupProjection()
    const filter = self.getFilter()

    d3.select('#d3Svg').remove()
    svg = d3.select(basemap.getCanvasContainer())
      .append('svg')
      .attr('id', 'd3Svg')
      .attr('width', width)
      .attr('height', height)

    svg
      .selectAll('.violation-marker')
      .data(markers)
      .enter()
      .append('circle')
        .attr('class', 'violation-marker')
        .attr('cx', d => { return getProjectedPoint(d.coords, projection)[0] })
        .attr('cy', d => { return getProjectedPoint(d.coords, projection)[1] })
        .style('fill', 'transparent')
        .attr('fill-opacity', 0.5)
        .attr('r', d => getMarkerRadius(d.total, basemap.getZoom(), filter.period))
        .attr('cursor', 'pointer')
      .on('click', d => printLegend(d))
      .on('mouseover', function (d) {
        d3.select(this)
          .style('fill', d => getMarkerColor(d))
          .attr('stroke', d => getMarkerColor(d))
      })
      .on('mouseout', function (d) {
        d3.select(this)
          .style('fill', 'transparent')
          .attr('stroke', 'transparent')
      })
  }

  // draw legend with sample size of violations
  self.drawLegend = () => {
    const filter = self.getFilter()

    d3.select('#lSvg').remove()
    const scaledRadius = r => getMarkerRadius(r, basemap.getZoom(), filter.period)

    var lSvg = d3.select(basemap.getCanvasContainer())
      .append('svg')
      .attr('id', 'lSvg')
      .attr('class', 'svg-wrapper')
      .attr('width', width)
      .attr('height', height)

    let sampleSize = []
    let periodLength = d3.timeMonth.count(...filter.period) + 1  // months
    if (periodLength < 3) { sampleSize = [1, 100, 250] }
    if (periodLength >= 3) { sampleSize = [50, 250, 500] }
    if (periodLength >= 6) { sampleSize = [50, 500, 1000] }


    lSvg.selectAll('.legend__circle')
      .data(sampleSize)
      .enter()
      .append('circle')
        .attr('class', 'legend__circle')
        .attr('cx', width - 96)
        .attr('cy', height - 32)
        .style('fill', 'transparent')
        .attr('stroke', '#666')
        .attr('r', d => scaledRadius(d))
        .attr('transform', d => `translate(0, -${scaledRadius(d)})`)

    // Add legend: segments
    lSvg
      .selectAll('.legend__line')
      .data(sampleSize)
      .enter()
      .append("line")
        .attr('x1', d => width - 96 - scaledRadius(d))
        .attr('x2', d => width - 128 - scaledRadius(d))
        .attr('y1', d => height - 32 - scaledRadius(d) )
        .attr('y2', d => height - 32 - scaledRadius(d) )
        .attr('stroke', 'black')
        .style('stroke-dasharray', ('2,2'))

    lSvg
      .selectAll('.legend__text')
      .data(sampleSize)
      .enter()
      .append("text")
        .attr('x', d => width - 132 - scaledRadius(d))
        .attr('y', d => height - 32 - scaledRadius(d) )
        .text(d => d)
        .style('font-size', 10)
        .attr('alignment-baseline', 'middle')
        .attr('text-anchor', 'end')
  }

  self.setupProjection = () => {
    center = Object.values(basemap.getCenter())
    const bbox = basemap.getContainer().getBoundingClientRect()
    const zoom = basemap.getZoom()
    const tileSize = 512 // tile size in pixel
    const scale = tileSize / (2 * Math.PI) * Math.pow(2, zoom)

    // config projection
    projection = projection.scale(scale)
    projection = projection.center(center)
    projection = projection.translate([
      bbox.width / 2,
      bbox.height / 2
    ])
  }

  // center-setter - takes lat first, then lng
  self.center = (lng, lat) => {
    if (!lng || !lat) { return center }
    center = [lng, lat]
    return self
  }

  self.data = value => {
    if (!value) { return data }
    data = value
    self.formatData()
    return self
  }

  self.getFilter = () => {
    return globalFilter
  }

  // this component takes all filters, but only care about markers within map boundary
  self.formatData = () => {
    let allMarkers = filterData(data, self.getFilter())

    if (!basemap) { return allMarkers }

    formattedData = groupByOccurrence(
      allMarkers
        .filter(d => basemap.getBounds().contains([d.coords.split(' ')[1], d.coords.split(' ')[0]]))
    )
  }

  self.clear = () => {
    var context = d3.select('#d3Canvas').node().getContext('2d')
    context.clearRect(0, 0, width, height)
  }

  return self
}