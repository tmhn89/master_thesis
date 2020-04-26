const bubbleMaps = () => {
  var width             = 800,
      height            = 600,
      center            = [24.937753465964533, 60.177494774748794],
      projection        = d3.geoMercator(),
      basemap           = null,
      svg               = null,
      data              = null,
      filteredData      = null,
      allMarkers        = [],
      visibleMarkers    = [],
      flying            = false, // flag to check if the map is in flying effect
      explorer          = {
        show              : false,
        markers           : null,
        centerCoords      : null,
        centerProjected   : null,
        radius            : EXPLORER_DEFAULT_RADIUS // meter
      }

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
      // style: 'mapbox://styles/mapbox/light-v10',
      style: 'mapbox://styles/tmhn89/ck95vwjsd04rw1io31umkkv1j',
      center: center,
      zoom: 12,
      minZoom: 11
    })

    basemap.on('load', () => {
      // set map and map-related component dimensions
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight

      self.draw()
      // start listen to global filter
      filterDispatch
        .on('filterChanged.maps', () => {
          self.filterMapboxMarkers()
          showLoader(false)
        })

      // set explorer activity
      d3.select('.control__button--explorer')
        .on('click', self.toggleExplorerState)
    })

    basemap.on('move', () => {
      // only draw on canvas when map move
      if (explorer.show && explorer.centerCoords) {
        self.showExplorer()
      }
    })

    basemap.on('moveend', e => {
      if (flying) {
        basemap.fire('flyend')
        flying = false
      }
    })

    basemap.on('resize', () => {
      // set map-related component dimension again
      width = basemap.getContainer().clientWidth
      height = basemap.getContainer().clientHeight
      // self.draw()
    })

    basemap.on('click', (e) => {
      let clickedMarkers = basemap
        .queryRenderedFeatures(e.point, { layers: ['violation'] })

      if (clickedMarkers.length > 0) {
        console.log(clickedMarkers)
        infoDispatch.call('locationSelected', this, {
          type: 'point',
          markers: [self.getLocationInfo(clickedMarkers)]
        })
      }

      ////////////////////mapbox click event end//////////////////////////////
      if (explorer.show) {
        explorer.centerCoords = e.lngLat
        console.log(e)
        self.showExplorer()
        self.hideExplorerGuide()
        return
      }

      if (basemap.getZoom() < ZOOM_INTERACTION_LEVEL) {
        basemap.flyTo({
          center: e.lngLat,
          zoom: ZOOM_INTERACTION_LEVEL + 0.1,
          essential: true
        })

        flying = true
      }
    })

    basemap.on('flyend', e => {
      // catch flyend event here
    })
  }

  // compose location info object based on markers under mouseclick on the map
  self.getLocationInfo = clickedMarkers => {
    const markerProps = clickedMarkers.map(d => d.properties)
    let result = {
      coords: `${d3.format('.7f')(markerProps[0].lat)} ${d3.format('.7f')(markerProps[0].lng)}`,
      reasons: {},
      total: 0
    }

    markerProps.forEach(marker => {
      if (!result.reasons[marker.reason]) {
        result.reasons[marker.reason] = 0
      }
      result.reasons[marker.reason] += marker.occurrence
    })

    result.total = total = markerProps
      .reduce(
        (total, current) => total + parseInt(current.occurrence),
        0
      )

    console.log(markerProps, result)
    return result
  }

  self.drawMapboxMarkers = () => {
    console.log(basemap, data)
    if (basemap.getLayer('violation')) {
      console.log('thru here')
      // basemap.removeLayer('violation')
      // basemap.removeSource('violation')
      basemap.setPaintProperty('violation', 'circle-opacity', 0.5)
      return
    }

    basemap.addSource('violation', {
      type: 'vector',
      url: 'mapbox://tmhn89.1yp4pdm1'
    })

    let violationLayer = {
      'id': 'violation',
      'type': 'circle',
      'source': 'violation',
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'circle-opacity': 0.5,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          12, ['max', ['/', ['get', 'occurrence'], 3], 2],
          20, ['max', ['*', ['get', 'occurrence'], 2], 10]
        ],
        'circle-color': self.getMapboxMarkerColor()
      },
      'source-layer': 'latlng_separated_2018_2019-7haajx',
      'filter': [
        'all',
        ['==', 'year', self.getFilter().period[0].getFullYear()],
        ['==', 'month', self.getFilter().period[0].getMonth() + 1]
      ]
    }

    basemap.addLayer(violationLayer)
    self.filterMapboxMarkers()
    // console.log(self.getMapboxMarkerColor())
    showLoader(false)
  }

  self.filterMapboxMarkers = () => {
    let mapboxFilter = [
      'all',
        ['==', 'year', self.getFilter().period[0].getFullYear()],
        ['==', 'month', self.getFilter().period[0].getMonth() + 1]
    ]

    if (self.getFilter().reasons && self.getFilter().reasons.length > 0) {
      // have to split since mapbox automatically cast id > 1000 into integer
      let mapboxReason = self
        .getFilter()
        .reasons
        .map(reason => {
          return parseInt(reason) > 1000
            ? parseInt(reason)
            : reason
        })

      mapboxFilter.push(['in', 'reason', ...mapboxReason])
    }

    basemap.setFilter('violation', mapboxFilter)
  }

  self.getMapboxMarkerColor = () => {
    const allReasons = [...new Set(data.map(d => d.reason))]
    const allColors = allReasons.map(reason => {
      colors = reason.split(' ').map(id => getReasonGroup(id).color2)
      return {
        reason: reason,
        color: chroma.average(colors, 'rgb').hex()
      }
    })

    console.log('color', allColors)

    // const allReasons = Object.keys(reasonListEn)
    // const allColors = allReasons
    //   .map(reason => getReasonGroup(reason).color2)
    let colorExpression = [
      'match',
      ['to-string', ['get', 'reason']]
    ]

    allColors.forEach(row => {
      colorExpression.push(row.reason)
      colorExpression.push(row.color)
    })

    // fallback value
    colorExpression.push('#999')
    return colorExpression
  }

  self.draw = () => {
    showLoader(true)
    self.drawMapboxMarkers()
    showLoader(false)
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

  self.toggleExplorerState = () => {
    explorer.show = !explorer.show

    d3.select('.control__button--explorer')
      .node()
      .classList
      .toggle('control__button--active')

    d3.select('.mapboxgl-canvas-container')
      .node()
      .classList
      .toggle('has-explorer')

    if (!explorer.show) {
      self.hideExplorer()
    } else {
      // hide location info if it is there, to give way for the guide
      d3.select('#locationInfo').style('right', '-500px')
      self.showExplorerGuide()
    }
  }

  self.showExplorer = () => {
    if (!d3.select('#eSvg').node()) {
      d3.select(basemap.getCanvasContainer())
        .append('svg')
        .attr('id', 'eSvg')
        .attr('class', 'svg-wrapper')
        .attr('width', width)
        .attr('height', height)
    }
    // remove old explorer circle there is one
    d3.select('.explorer__border').remove()
    d3.select('.explorer__circle').remove()

    explorer.centerProjected = basemap.project(explorer.centerCoords)
    // border - used for dragging the size
    d3.select('#eSvg')
      .append('circle')
        .attr('class', 'explorer__border')
        .attr('cx', explorer.centerProjected.x)
        .attr('cy', explorer.centerProjected.y)
        .style('fill', 'transparent')
        .attr('stroke', '#666')
        .attr('stroke-width', 2.7 + 0.05 * basemap.getZoom())
        .attr('cursor', 'nesw-resize')
        .attr('r', explorer.radius * self.getPixelPerMeter())
      .call(d3.drag()
        .on('drag', function () {
          // set new radius on dragging
          let newBorderPoint = new mapboxgl.Point(d3.event.x, d3.event.y)

          // calculate new radius in meter
          let newBorderPointCoords = basemap.unproject(newBorderPoint)
          explorer.radius = explorer.centerCoords.distanceTo(newBorderPointCoords)

          if (explorer.radius >= EXPLORER_MAX_RADIUS) {
            explorer.radius = EXPLORER_MAX_RADIUS
            return
          }

          explorer.centerProjected = new mapboxgl.Point(
            d3.select('.explorer__border').attr('cx'),
            d3.select('.explorer__border').attr('cy')
          )

          let newRadius = explorer.centerProjected.dist(newBorderPoint)

          // update the view
          d3.select('.explorer__border').attr('r', newRadius)
          d3.select('.explorer__circle').attr('r', newRadius)
          self.drawMarkersInExplorer()
        })
      )

    d3.select('#eSvg')
      .append('circle')
        .attr('class', 'explorer__circle')
        .attr('cx', explorer.centerProjected.x)
        .attr('cy', explorer.centerProjected.y)
        .style('fill', '#999')
        .style('fill-opacity', 0.2)
        .attr('r', explorer.radius * self.getPixelPerMeter())
      .call(d3.drag()
        .on('drag', function () {
          // update explorer circle center
          explorer.centerProjected = new mapboxgl.Point(d3.event.x, d3.event.y)
          // convert new center to coords
          explorer.centerCoords = basemap.unproject(explorer.centerProjected)

          // update the view
          d3.select('.explorer__border')
            .attr('cx', explorer.centerProjected.x)
            .attr('cy', explorer.centerProjected.y)
          d3.select('.explorer__circle')
            .attr('cx', explorer.centerProjected.x)
            .attr('cy', explorer.centerProjected.y)

          // recreate explore layer
          self.drawMarkersInExplorer()
        })
        // .on('end', function() {
        //   self.drawMarkersInExplorer()
        // })
      )

    self.drawMarkersInExplorer()
  }

  self.hideExplorer = () => {
    self.hideExplorerGuide()
    d3.select('#eSvg').remove()
    // reset explorer object
    explorer          = {
      show              : false,
      markers           : null,
      centerCoords      : null,
      centerProjected   : null,
      radius            : EXPLORER_DEFAULT_RADIUS // meter
    }
    self.draw()

    // hide info box
    infoDispatch.call('locationDeselected')
  }

  self.drawMarkersInExplorer = () => {
    console.log('redrawing')
    // fixed distance as 350m at first. only display marker within explore circle
    // set paint opacity of marker outside explorer as 0.1

    explorer.markers = basemap
      .queryRenderedFeatures()
      .filter(d => {
        return explorer.centerCoords.distanceTo({
          lat: d.properties.lat,
          lng: d.properties.lng
        }) < 350
      })
    console.log(explorer)

    basemap
      .setPaintProperty(
        'violation',
        'circle-opacity',
        [
          'match',
          ['id'],
          explorer.markers.map(d => d.id),
          0.5,
          0.1
        ]
      )

    // emit selected marker up
    infoDispatch.call('locationSelected', this, {
      type: 'area',
      radius: explorer.radius,
      markers: explorer.markers,
      total: d3.sum(explorer.markers, d => d.properties.occurrence)
    })

    // infoDispatch.call('locationSelected', this, {
    //   type: 'area',
    //   radius: explorer.radius,
    //   markers: explorer.markers,
    //   total: d3.sum(explorer.markers, d => d.total)
    // })
  }

  self.getPixelPerMeter = () => {
    // take two points on the map and measure their distance using mapbox
    const point1 = new mapboxgl.LngLat(24, 60)
    const point2 = new mapboxgl.LngLat(24.001, 60)
    const distanceMeter = point1.distanceTo(point2)
    // then calculate their projected distance in pixel
    const projected1 = basemap.project(point1)
    const projected2 = basemap.project(point2)
    const distancePixel = projected1.dist(projected2)
    // Pixel-per-meter
    const mpp = distancePixel / distanceMeter
    return mpp
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
    return self
  }

  self.getFilter = () => {
    return globalFilter
  }

  self.isExplorerShowing = () => {
    return explorer.show
  }

  self.showExplorerGuide = () => {
    d3.select('.section--explorer-help')
      .style('opacity', '1')
  }

  self.hideExplorerGuide = () => {
    d3.select('.section--explorer-help')
      .style('opacity', '0')
  }

  return self
}