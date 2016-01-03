import matplotlib.pyplot as pyplot
import numpy
import json

shears = [[] for i in range(12)]
with open("all.json") as data_file:
    data = json.load(data_file)
    for timestep in data:
        for i in range(12):
            shears[i].append(float(timestep[i]))

pyplot.figure(1)
"""
for i in range(12):
    pyplot.subplot(12,1,12-i)
    pyplot.axis([0,len(shears[i]),-4,4])
    pyplot.plot(shears[i])
    print(len(shears[i]))
"""
pyplot.figure(3)
cm = pyplot.get_cmap('viridis')
for i in range(12):
    pyplot.axis([0,len(shears[i]),-4,4])
    pyplot.plot(shears[i],color=cm(i/12))
    print(len(shears[i]))
#pyplot.colorbar()
pyplot.show()
