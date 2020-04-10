
var isFirst = true

d3
  .dsv(';', 'data/hri_2019_e.csv', row => {
    // process each row here
    // if (isFirst) { console.log(row); isFirst = false }

    if (getColumnValue(row, 0) == 'Huhtikuu' && getColumnValue(row, 2) == "Turunlinnantie 14") {
      console.log(row)
    }

    return {
      month: getColumnValue(row, 0),
      year: getColumnValue(row, 1),
      address: getColumnValue(row, 2),
      is_warning: getColumnValue(row, 3) === 'Huomautus',
      reason: parseReasonString(getColumnValue(row, 4))
    }
  })
  .then(data => {
    process(data)
  })

const getColumnValue = (row, colNum) => {
  const entries = Object.entries(row)
  return entries[colNum][1]
}

const parseReasonString = reason => {
  return reason.match(/[0-9]+/gi)
  // "0401 Pysäköintikieltoalue liikennemerkin noudattamatta jättäminen 2001 Pysäköinti ajosuunnan vastaisesti "
  // turned into ["0401", "2001"]
}

const process = data => {
  console.log('--start processing--')
  console.log(data)
  // group by month then by address
  const groups = d3.group(data, d => d.month, d => d.address)
  // process the reason text. format: [code] [text] [code] [text]
  // split into array
  console.log('groups', groups)
}