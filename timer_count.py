import threading
import time
from alert_sms import send_sms
from app import navigate


class TimerClass(threading.Thread):
    def __init__(self, count):
        threading.Thread.__init__(self)
        self.event = threading.Event()
        self.count = count

    def run(self):
        save = self.count
        print(save)
        while self.count > 0 and not self.event.is_set():
            self.count -= 1
            self.event.wait(1)

        if self.count <= 0:
            send_sms('"Dear Loved One, You seem to forget taking your medication today!!!"') 
            navigate()
        self.count = save


    def stop(self, nav=True):
        print('am i stop?')
        self.event.set()
        if nav:
            navigate()