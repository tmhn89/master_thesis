var isFirst = true

// @todo: come back to this when more years are loaded
const fetchViolationData = () => {
  return Promise.all([
    d3.csv('data/counted_2019_no_address.csv', row => parseRow(row, 2019)),
    d3.csv('data/counted_2018_no_address.csv', row => parseRow(row, 2018))
  ]).then(files => {
    return files[0].concat(files[1])
  })
}

const parseRow = (row, year) => {
  return {
    year: year,
    month: getColumnValue(row, 0),
    is_warning: getColumnValue(row, 1),
    reason: getColumnValue(row, 2),
    coords: getColumnValue(row, 3),
    occurrence: getColumnValue(row, 4)
  }
}

const fetchAddressLocation = () => {
  return d3.dsv(',', 'data/addresses.csv', row => {
    return {
      address: getColumnValue(row, 0),
      coords: getColumnValue(row, 1)
    }
  })
}

const fetchReasonGroups = () => {
  return d3.json('data/violation_reason_groups.json', row => {
    return row
  })
}

const fetchMap = () => {
  return d3.json('https://raw.githubusercontent.com/dhh16/helsinki/master/osaalueet.geojson').then(data => {
    data.features = data.features
      // .filter(d =>  { return d.properties.name === 'Finland' })
    return data
  })
}

const getColumnValue = (row, colNum) => {
  const entries = Object.entries(row)
  return entries[colNum][1]
}