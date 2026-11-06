import sys,json,math
tgt=lambda a: round(5741-1082*math.log(max(a,8)))
for l in sys.stdin:
  d=json.loads(l); a=d['A'];b=d['B']; bal=(a['acplBal']+b['acplBal'])/2
  print(d['ra'], 'perf', (a['perf']+b['perf'])//2, 'balPerf', tgt(bal), 'acpl', (a['acpl']+b['acpl'])//2, 'bal', bal, 'bl40', round((a['blundersPer40']+b['blundersPer40'])/2,2), 'plies', d['avgPlies'])
