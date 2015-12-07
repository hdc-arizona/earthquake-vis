#!/usr/local/bin/python3

import sys

if len(sys.argv) != 2:
    print("Usage %s inputFile" % sys.argv[0])
    sys.exit(1)

fin = open(sys.argv[1], "r")
c = 0
for line in fin:
    if (c == 0):
        print(line)
    l = line.split();
    ",".join(l)
