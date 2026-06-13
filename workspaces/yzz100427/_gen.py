import os
b = os.path.join('/Users/bill/Documents/solo/workspaces/yzz100427', 'src/types/index.ts')
with open(b, 'w') as f:
    f.write(open('/Users/bill/Documents/solo/workspaces/yzz100427/_types_b64.txt').read().strip() + '\n')
print('types done')
