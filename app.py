import json
from flask import Flask, redirect, request, render_template, jsonify
import time
import threading
from alert_sms import send_sms
import timer_count

app = Flask(__name__)

INTERRUPT_FLAG = False  # Signal from Raspi
SCHEDULE_TIME = None # Default time 3min 
RESET = False
COUNT = None


@app.route('/')
def home():  
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
    SCHEDULE_TIME = time_second
    COUNT = timer_count.TimerClass(time_second, INTERRUPT_FLAG)
    COUNT.start()
    return render_template('index.html')

def setReset(flag):
    RESET = flag

def countDown():
    while SCHEDULE_TIME<0:
        if INTERRUPT_FLAG:
            break
        time.sleep(1)
        SCHEDULE_TIME -= 1

    # Send message through twilio
    if SCHEDULE_TIME == 0 and not INTERRUPT_FLAG:
        send_sms('"Oh Nooo....You forgot to take your medication today!!!"') 
        return render_template('index.html')

    if INTERRUPT_FLAG:
        INTERRUPT_FLAG = False
        return render_template('index.html')


@app.route('/schedule/count', methods=['PUT'])
def restart_count():
    return jsonify({'status': 'success'})

@app.route('/schedule/interrupt', methods=['PUT'])
def interruptCount():
    """
    Interrupt the coundown
    :param list_time: float list of time stamp in second
    :return None
    """
    # INTERRUPT_FLAG = True
    COUNT.stop()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)