import RPi.GPIO as GPIO
import http.client

LED_PIN = 13
COVER_PIN = 5
DOWN_PIN = 5 
ledState = False

GPIO.setmode(GPIO.BCM)
GPIO.setup(5, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(6, GPIO.OUT)
GPIO.output(6,GPIO.LOW)

GPIO.setup(13,GPIO.OUT)
GPIO.output(13,ledState) 

conn = http.client.HTTPConnection("0.0.0.0:5000") # Can ip address point to application

headers = {
    'authorization': "Basic ZDRmNjk5YmE3ODVjNGU4Nzg2MmY3NzRkNWY3NDVjZTU6MzQ5MjBlOTkyN2I5NGY1ZDhmMTEyM2VjMzViODlhNzA=",
    'content-type': "application/json",
    'cache-control': "no-cache",
    'postman-token': "d765d99e-00f3-c425-25d9-6804541e8044"
    }   
	
def coverClose():
	global ledState
	ledState = not ledState
	GPIO.output(13,ledState)          
	if ledState == True:
		conn.request("PUT", "/schedule/interrupt", headers=headers)
	else:
		conn.request("PUT", "/schedule/count", headers=headers)
	res = conn.getresponse()
    data = res.read()
    print(data.decode("utf-8"))
    

#GPIO.output(6,GPIO.LOW) - LED off
#GPIO.output(6,GPIO.HIGH) - LED on
GPIO.add_event_detect(5, GPIO.BOTH, bouncetime=700)
while True:
	if GPIO.event_detected(5):
		coverClose()
