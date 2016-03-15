shear = open("1_ShearNormalized.txt", "r")
moment = open("2_MomentNormalized.txt", "r")
diaForce = open("3_DiaphForceNormalized.txt", "r")
diaAccOverPGA = open("4_DiaAcc_dividedby_PGA.txt", "r")
driftRatio = open("5_DriftRatio.txt", "r")
interDriftRatio = open("6_InterstoryDriftRatio.txt", "r")

txtOut = open("matrix.txt", "w")
jsonOut = open("matrix.json", "w")
jsonOut.write("[\n")
timestep = 0
for shearLine in shear:
    momentLine = moment.readline()
    diaForceLine = diaForce.readline()
    diaAccOverPGALine = diaAccOverPGA.readline()
    driftRatioLine = driftRatio.readline()
    interDriftRatioLine = interDriftRatio.readline()
    l = []
    l.append(shearLine.split())
    l.append(momentLine.split())
    l.append(diaAccOverPGALine.split())
    l.append(diaAccOverPGALine.split())
    l.append(driftRatioLine.split())
    l.append(interDriftRatioLine.split())
    for floor in range(0, 13):
        txt = str(timestep) + "\t" + str(floor)
        if (timestep == 0 and floor == 0):
            json = "[%d,%d" % (timestep, floor)
        else:
            json = ",[%d,%d" % (timestep, floor)
        for attr in l:
            txt += "\t" + str(attr[floor])
            json += ", " + str(attr[floor])
        json += "]\n"
        txt += "\n"
        txtOut.write(txt)
        jsonOut.write(json)
    timestep += 1

jsonOut.write("]\n")
