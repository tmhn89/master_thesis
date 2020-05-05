import pandas as pd
import re
import pdb

year = 2019

processed_data = pd.read_csv('data/processed_{}_full.csv'.format(year), sep=',')
df             = pd.DataFrame(processed_data, columns = [
  'month', 'address', 'is_warning', 'reason', 'coords'
])

print(df.count())

