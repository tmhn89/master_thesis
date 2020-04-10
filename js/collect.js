var isFirst = true

const fetchViolationData = () => {
  return d3.dsv(',', 'data/counted_2019_no_address.csv', row => {
    let violation = {
      month: getColumnValue(row, 0),
      is_warning: getColumnValue(row, 1),
      reason: getColumnValue(row, 2),
      coords: getColumnValue(row, 3),
      occurrence: getColumnValue(row, 4)
    }

    return violation
  })
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
    console.log(row)
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