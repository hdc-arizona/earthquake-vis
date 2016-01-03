from flask import Flask

app = Flask(__name__)

# disable debug when deloying
app.debug = True


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path):
    # send static_file will guess the correct MIME type
    return app.send_static_file(path)


if __name__ == '__main__':
    app.run()