import threading
import time

class TimerClass(threading.Thread):
    def __init__(self, count, interupt):
        threading.Thread.__init__(self)
        self.event = threading.Event()
        self.count = count
        self.interupt = interupt

    def run(self):
        while self.count > 0 and not self.event.is_set():
            if self.interupt:
                break
            self.count -= 1
            self.event.wait(1)

    def stop(self):
        self.event.set()