#!/usr/local/bin/python3
from flask import Flask, render_template
from flask_bootstrap import Bootstrap

import os

app = Flask(__name__)
Bootstrap(app)

# disable debug when deloying
app.debug = True

cwd = os.getcwd()

path_to_eqs = cwd+'/static/data/earthquakes'
eq_dirs = os.listdir(path_to_eqs)
eqs = {}
filenames = [
    "1_ShearNormalized.txt", "2_MomentNormalized.txt",
    "3_DiaphForceNormalized.txt", "4_DiaAcc_dividedby_PGA.txt",
    "5_DriftRatio.txt", "6_InterstoryDriftRatio.txt"
]
for d in eq_dirs:
    if d[0] == '.':
        pass
    else:
        l = []
        sub = os.listdir("/".join([path_to_eqs, d]))
        eqs[d[9:]] = {}
        for subitem in sub:
            if subitem[0] == ".":
                pass
            if os.path.isdir("/".join([path_to_eqs, d, subitem])):
                sim = []
                e = os.listdir("/".join([path_to_eqs, d, subitem]))
                for f in filenames:
                    if f in e:
                        l.append(True)
                    else:
                        l.append(False)
                eqs[d[9:]][subitem[10:]] = l


@app.route('/vis')
def index():
    return app.send_static_file('index.html')


@app.route('/')
def earthquakes():
    from form import NewSimulationDataForm
    newForm = NewSimulationDataForm(csrf_enabled=False)
    return render_template('earthquakes.html', eqs=eqs,
                           files=filenames, newSimForm=newForm)


@app.route('/<path:path>')
def static_proxy(path):
    # send static_file will guess the correct MIME type
    return app.send_static_file(path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
