# group violation with same month, and reason

import pandas as pd
import re
import pdb

import time
start_time = time.time()

year = 2018

processed_data = pd.read_csv('data/processed_{}_no_address.csv'.format(year), sep=',')
df             = pd.DataFrame(processed_data, columns = [
  'month', 'is_warning', 'reason', 'coords'
])

cdf = df.groupby(df.columns.tolist()).size().reset_index().rename(columns = {0: 'occurrence'})

cdf.to_csv('data/counted_{}_no_address.csv'.format(year), index = False, header = True)

# print(df.isnull().sum()) # number of empty coords (unable-to-convert-addresses)
# print(cdf['occurrence'].sum()) # total of violation having coords

print('\n-- all done in {} seconds --'.format(time.time() - start_time))
