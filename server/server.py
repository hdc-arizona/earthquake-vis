#!/usr/local/bin/python3
from flask import Flask, render_template, request
from flask_bootstrap import Bootstrap
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + \
        os.path.join(BASE_DIR, 'log.sqlite')
Bootstrap(app)
db = SQLAlchemy(app)

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


@app.route('/nano-vis')
def nano():
    return app.send_static_file('nano.html')


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


class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sim = db.Column(db.Integer)
    tStart = db.Column(db.Integer)
    tEnd = db.Column(db.Integer)
    fStart = db.Column(db.Integer)
    fEnd = db.Column(db.Integer)
    nanoTime = db.Column(db.Float)
    jsTime = db.Column(db.Float)

    def __init__(self, sim, tStart, tEnd, fStart, fEnd, nanoTime, jsTime):
        self.sim = sim
        self.tStart = tStart
        self.tEnd = tEnd
        self.fStart = fStart
        self.fEnd = fEnd
        self.nanoTime = nanoTime
        self.jsTime = jsTime

    def __repr__(self):
        return '<Log %d>' % self.id


@app.route('/log', methods=['GET', 'POST'])
def log():
    if request.method == 'POST':
        sim = request.form['sim']
        print(sim)
        tStart = request.form['timeStart']
        print(tStart)
        tEnd = request.form['timeEnd']
        print(tEnd)
        fStart = request.form['floorStart']
        print(fStart)
        fEnd = request.form['floorEnd']
        print(fEnd)
        nanoTime = request.form['nanoTime']
        print(nanoTime)
        jsTime = request.form['jsTime']
        print(jsTime)
        log = Log(sim, tStart, tEnd, fStart, fEnd, nanoTime, jsTime)
        db.session.add(log)
        db.session.commit()
        return str(log.id)
    else:
        logs = Log.query.all()
        return render_template('log.html', logs=logs)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
