from twilio.rest import TwilioRestClient

# Find these values at https://twilio.com/user/account
account_sid = "ACe093e30536f43a2573906fb8e799208d"
auth_token = "a47f1c52ef272a4bddced3c4949872e0"
_from = "(514) 700-0656"
_to = "+1514-991-6283"

client = TwilioRestClient(account_sid, auth_token)

def send_sms(message):
	try:
		message = client.messages.create(to=_to, from_=_from, body=message)
	except Exception as e:
		return False
	print('ALERT!')
	return True