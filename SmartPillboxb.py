import RPi.GPIO as GPIO
# import requests
LED_PIN = 13
COVER_PIN = 5
DOWN_PIN = 5 
ledState = False

GPIO.setmode(GPIO.BCM)
GPIO.setup(5, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(6, GPIO.OUT)
GPIO.output(6,GPIO.LOW)
interruptLink = 'http://192.168.0.103:5000/api/schedules/interrupt'

GPIO.setup(13,GPIO.OUT)
GPIO.output(13,ledState)    
	
def coverClose():
	global ledState
	ledState = not ledState
	GPIO.output(13,ledState)          
	if ledState == True:
		print("Signal request. Cover was opened")
	else:
		print("Signal request. Cover was closed")

# def pillInt():
    # requests.put(url = interruptLink)

#GPIO.output(6,GPIO.LOW) - LED off
#GPIO.output(6,GPIO.HIGH) - LED on
GPIO.add_event_detect(5, GPIO.BOTH, bouncetime=700)
while True:
	if GPIO.event_detected(5):
		coverClose()
