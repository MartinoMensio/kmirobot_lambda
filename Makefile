zip:
	rm *.zip && zip -r skill_lambda.zip . -x \*.git\*

test:
	HURIC_URI=https://postman-echo.com/post node -e 'require("./index").test()'