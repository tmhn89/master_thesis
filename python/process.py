import pandas as pd
import re
import pdb

import time
start_time = time.time()

import googlemaps
gmaps = googlemaps.Client(key='AIzaSyBoLgIe6ZT1H1yutB1NYr4P3bJJJfyhwE0')

year = 2018
rec = 1

print('-- start --')

hri_data = pd.read_csv('data/hri_{}_e.csv'.format(year), sep=';')
# only take four columns: month, address, type (warning / fine), reason
# original dataset does not have lat/lng. Add these
# .head(10) = .loc[0:9]
df = pd.DataFrame(hri_data, columns = [
  'Virheen tekokuukausi',
  'Osoite',
  'Virhemaksun vaihe',
  'Virheen  pääluokka / pääsyy',
  # 'coords'
])

# rename column to English
# df.columns = ['month', 'address', 'is_warning', 'reason', 'coords']
df.columns = ['month', 'address', 'is_warning', 'reason']

# month: replace Finnish month name with number
df['month'].replace({
  'Tammikuu': '1',
  'Helmikuu': '2',
  'Maaliskuu': '3',
  'Huhtikuu': '4',
  'Toukokuu': '5',
  'Kesäkuu': '6',
  'Heinäkuu': '7',
  'Elokuu': '8',
  'Syyskuu': '9',
  'Lokakuu': '10',
  'Marraskuu': '11',
  'Joulukuu': '12',
}, inplace=True)

# is_warning: true for Huomautus, false for Pysäköintivirhe
df['is_warning'].replace({
  'Huomautus': '1',
  'Pysäköintivirhe': '0',
  'Pysäköintivirhemaksu': '0'
}, inplace=True)

# print(df.groupby(['is_warning', 'month']).count())

def get_reason_ids (reason_str):
  if not isinstance(reason_str, str):
    # set no-reason record as 9999
    return '9999'

  result = ' '.join(re.findall('[0-9]{4}', reason_str))
  return result

# reason: leave only number, separated by space
df['reason'] = df['reason'].apply(get_reason_ids)

# @todo: lat, lng
def set_coords (address_text):
  global rec
  print('\rprocessing: {}'.format(rec), end='')
  rec += 1

  coords = ''

  if pd.notnull(address_text):
    # trim leading / trailing white spaces
    address_text = address_text.strip()
    # search for location on address csv
    address_data  = pd.read_csv('data/addresses.csv', sep=',')
    adf           = pd.DataFrame(address_data, columns=['address', 'coords'])

    address_record  = adf.loc[adf['address'] == address_text]

    # if address not found, search using google library then save into address file
    if address_record.empty:
      print(' - geocoding: {}'.format(address_text + ' Helsinki'))
      geocode_result  = gmaps.geocode(address_text + ' Helsinki')

      if not geocode_result == []:
        lat             = geocode_result[0]['geometry']['location']['lat']
        lng             = geocode_result[0]['geometry']['location']['lng']
        coords          = '{:10.7f} {:10.7f}'.format(lat, lng)

      adf = adf.append({
        'address': address_text,
        'coords': coords
      }, ignore_index=True)

      adf = adf.sort_values(by='address')

      adf.to_csv('data/addresses.csv', index = False, header = True)
    else:
      coords = address_record.iloc[0]['coords']
  else:
    print(' - no address given')

  return coords

df['coords'] = df['address'].apply(set_coords)
# df['address'].apply(set_coords)

# save to smaller file
df.to_csv('data/processed_{}_full.csv'.format(year), index = False, header = True)
# df.to_csv('data/processed_{}.csv'.format(year), mode = 'a', index = False, header = False)

df = df.drop(columns='address').to_csv('data/processed_{}_no_address.csv'.format(year), index = False, header = True)

# print('\n-- reformat done in {} seconds --'.format(time.time() - start_time))

print('\n-- all done in {} seconds --'.format(time.time() - start_time))
