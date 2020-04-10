const bubbleMaps = () => {
  var width         = 800,
      height        = 600,
      center        = [24.937753465964533, 60.177494774748794],
      projection    = d3.geoMercator(),
      basemap       = null,
      svg           = null,
      mapData       = null,
      violationData = null,
      filter        = { period: [11, 11], reason: null, bound: null },
      canvasMarkers = [],
      svgMarkers    = []

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
    })

    basemap.on('load', () => {
      // set map and map-related component dimensions
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight
      self.generateMarkers()
      // self.drawRegionMap()
    })

    basemap.on('idle', () => {
      self.draw()
    })

    basemap.on('move', () => {
      self.clearSvg()
      // self.drawRegionMap()
      // only draw on canvas when map move
      self.drawCanvas()
    })

    basemap.on('resize', () => {
      self.clearSvg()
      // set map-related component dimension again
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight
      self.drawCanvas()
    })
  }

  self.draw = () => {
    self.drawCanvas()
    // draw only markers visible on map when zoom level is greater than 14
    if (basemap.getZoom() >= ZOOM_INTERACTION_LEVEL) {
      self.drawSvg()
    }
  }

  self.drawCanvas = () => {
    self.setupProjection()

    d3.select('#d3Canvas').remove()
    d3.select(basemap.getCanvasContainer())
      .append('canvas')
      .attr('id', 'd3Canvas')
      .attr('width', width)
      .attr('height', height)
    // get context and clear the canvas
    var context = d3.select('#d3Canvas').node().getContext('2d')
    context.clearRect(0, 0, width, height)

    canvasMarkers.forEach(marker => {
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
  self.drawSvg = () => {
    d3.select('#d3Svg').remove()
    svg = d3.select(basemap.getCanvasContainer())
      .append('svg')
      .attr('id', 'd3Svg')
      .attr('width', width)
      .attr('height', height)

    svg
      .selectAll('violation')
      .data(svgMarkers)
      .enter()
      .append('circle')
        .attr('cx', d => { return getProjectedPoint(d.coords, projection)[0] })
        .attr('cy', d => { return getProjectedPoint(d.coords, projection)[1] })
        .style('fill', 'transparent')
        .attr('fill-opacity', 0.5)
        .attr('r', d => getMarkerRadius(d.total, basemap.getZoom(), filter.period))
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

  // the plan is to take helsinki border and clip the basemap based on it. will come back later
  self.drawRegionMap = () => {
    console.log('-drawing region map-')
    self.setupProjection()
    const geoPath = d3.geoPath().projection(projection)

    d3.select('#rSvg').remove()
    var rSvg = d3.select(basemap.getCanvasContainer())
      .append('svg')
      .attr('id', 'rSvg')
      .attr('width', width)
      .attr('height', height)

    rSvg.append('g')
      .selectAll('path')
      .data(mapData.features)
      .enter()
      .append('path')
        .attr('fill', '#b8b8b8')
        .attr('d', geoPath)
        .style('stroke', '#2d2d2d')
        .style('opacity', .3)
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

  // map-setter
  self.mapData = value => {
    if (!value) { return mapData }
    mapData = value
    return self
  }

  self.violationData = value => {
    if (!value) { return violationData }
    violationData = value
    self.generateMarkers()
    return self
  }

  self.filter = value => {
    if (!value) { return filter }
    filter = value
    // only start drawing when period selector snapping complete
    setTimeout(() => {
      self.generateMarkers()
      self.draw()
    }, SNAPPING_ANIMATION_DURATION + 100)
    return self
  }

  self.generateMarkers = () => {
    if (violationData && basemap) {
      // generate marker list on filter change
      let filteredData = filterData(violationData, filter)
      printSummary(filteredData)

      canvasMarkers = groupByOccurrence(filteredData)
      svgMarkers = groupByOccurrence(
        filteredData
          .filter(d => basemap.getBounds().contains([d.coords.split(' ')[1], d.coords.split(' ')[0]]))
      )
    } else {
      canvasMarkers = []
      svgMarkers = []
    }
  }

  // clear svg content
  self.clearSvg = () => {
    if (svg) {
      svg.selectAll('*').remove()
    }
  }

  return self
}