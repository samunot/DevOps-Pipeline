from flask import Flask
from flask import *
from flask_bootstrap import Bootstrap
import subprocess
import json

app = Flask(__name__)
Bootstrap(app)

@app.route('/')
def index():
    mysql_container_id = subprocess.check_output(['docker-compose', 'ps', '--quiet', 'mysql'], universal_newlines=True).strip()
    mysql_container_info = None
    if mysql_container_id:
        mysql_container_info = json.loads(subprocess.check_output(['docker', 'inspect', mysql_container_id]))[0]
    itrust2_container_id = subprocess.check_output(['docker-compose', 'ps', '--quiet', 'itrust2'], universal_newlines=True).strip()
    itrust2_container_info = None
    if itrust2_container_id:
        itrust2_container_info = json.loads(subprocess.check_output(['docker', 'inspect', itrust2_container_id]))[0]
    print(mysql_container_info['State']['Running'])
    return render_template('index.html',
        mysql_container_id=mysql_container_id,
        mysql_container_info=mysql_container_info,
        itrust2_container_id=itrust2_container_id,
        itrust2_container_info=itrust2_container_info
        )

action = {
    'up'     : 'up --detach'.split(' '),
    'start'  : 'start'.split(' '),
    'restart': 'restart'.split(' '),
}

@app.route('/service/<service_name>', methods=['POST'])
def service(service_name):
    print(request.form['action'])
    print(action[request.form['action']])
    completed_subprocess = subprocess.run(['docker-compose'] + action[request.form['action']] + [service_name])
    return redirect(url_for('index'))

chaos = {
    'net_delay'   : 'tc qdisc add dev eth0 root netem delay 50ms 20ms distribution normal'.split(' '),
    'net_corrupt' : 'tc qdisc add dev eth0 root netem corrupt 50%'.split(' '),
    'net_rate'    : 'tc qdisc add dev eth0 root netem delay 250ms loss 10% rate 1mbps'.split(' '),
    'net_reset'   : 'tc qdisc delete dev eth0 root netem'.split(' '),
}

@app.route('/container/<container_id>', methods=['POST'])
def container(container_id):
    print(request.form['chaos'])
    print(chaos[request.form['chaos']])
    completed_subprocess = subprocess.run(['docker', 'exec', container_id] + chaos[request.form['chaos']])
    return redirect(url_for('index'))
