#!/usr/local/bin/python3
"""
import json

from pprint import pprint

data = []

fin = open("matrix.csv", "r")

print("frame,floor,shear,nMoment,nDiaF")
lCount = 0
for line in fin:
    #print(line)
    l = line.split(",")
    #pprint(l)
    rl = []
    for i in range(12):
        print("%d,%d,%s,%e,%e" % (lCount,i,l[i], (float(l[i+12])+float(l[i+13]))/2, (float(l[i+25])+float(l[i+26]))/2))
    lCount += 1

fin.close()
"""

fin = open("nall.csv", "r")

print("[")

print("]")