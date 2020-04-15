import pandas as pd
import re
import pdb

import time
start_time = time.time()

year = 2019
rec = 1

data = pd.read_csv('data/counted_{}_no_address.csv'.format(year), sep=',')

df = pd.DataFrame(data, columns = [
  'month','is_warning','reason','coords','occurrence'
  # 'coords'
])

def get_lat (coords):
  global rec
  print('\rprocessing: {}'.format(rec), end='')
  rec += 1
  if not coords:
    return 0
  return coords.split(' ')[0]


def get_lng (coords):
  if not coords:
    return 0
  return coords.split(' ')[1]

df['year'] = year
df['lat'] = df['coords'].apply(get_lat)
df['lng'] = df['coords'].apply(get_lng)

df.drop(columns='coords').to_csv('data/mapbox_{}.csv'.format(year), index = False, header = True)

print('\n-- all done in {} seconds --'.format(time.time() - start_time))
