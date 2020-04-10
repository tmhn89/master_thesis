const WIDTH   = 800
const HEIGHT  = 600
// const CENTER  = [60.1629733, 24.893199]
const CENTER  = [24.893199, 60.1629733]

const mSvg = d3.select("#maps")
  .append('svg')
  .attr('width', WIDTH)
  .attr('height', HEIGHT)

const mProjection = d3.geoMercator()
  .scale(60000)
  // .center([CENTER[1], CENTER[0]])
  .center(CENTER)
  .translate([WIDTH / 2, HEIGHT / 2])

mSvg
  .append('circle')
    .attr('cx', mProjection(CENTER)[0])
    .attr('cy', mProjection(CENTER)[1])
    .attr('r', 6)
    .style('fill', '#e74c3c')
    .attr('stroke', '#c0392b')
    .attr('stroke-width', 2)
    .attr('fill-opacity', .4)