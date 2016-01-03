#!/usr/local/bin/python3

import sys

if len(sys.argv) != 2:
    print("Usage %s inputFile" % sys.argv[0])
    sys.exit(1)

fin = open(sys.argv[1], "r")
counter = 0
first = True
print("[")
for line in fin:
    l = line.split()
    if (first):
        print("[" + ",".join(l) + "]")
        first = False
    else:
         print(",[" + ",".join(l) + "]")
print("]")
