import json
from flask import Flask, redirect, request, render_template, jsonify
import time
import threading
import timer_count

app = Flask(__name__)

INTERRUPT_FLAG = False  # Signal from Raspi
SCHEDULE_TIME = None # Default time 3min 
RESET = False
COUNT = None


@app.route('/')
def home():
    if SCHEDULE_TIME is None: 
        print('SET COUNTER NOW!')
        global COUNT
        COUNT = timer_count.TimerClass(60)
        COUNT.start() 
    return render_template('index.html')


@app.route('/schedule', methods=['POST'])
def scheduleRequest():
    """
    Expected receiving input schedule.
    :return: None
    """
    str_time = request.form["startTime"]
    time_list = str_time.split(':')
    time_second = int(time_list[0]) * 3600 + int(time_list[1]) * 60
    # setReset(True)
    global SCHEDULE_TIME
    SCHEDULE_TIME = time_second
    if COUNT is not None:
        COUNT.stop(nav=False)
    global COUNT
    COUNT = timer_count.TimerClass(time_second)
    COUNT.start()
    return render_template('index.html')


@app.route('/schedule/count', methods=['PUT'])
def restart_count():
    print(SCHEDULE_TIME)
    if SCHEDULE_TIME is None:
        global SCHEDULE_TIME
        SCHEDULE_TIME = 60
    global COUNTER
    COUNT = timer_count.TimerClass(SCHEDULE_TIME)
    COUNT.start()
    return jsonify({'status': 'success'})

@app.route('/schedule/interrupt', methods=['PUT'])
def interruptCount():
    """
    Interrupt the coundown
    :param list_time: float list of time stamp in second
    :return None
    """
    
    COUNT.stop()
    global COUNT
    COUNT = None
    print('am i send response?')
    return jsonify({'status': 'success'})

def navigate():
    redirect('/')

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)