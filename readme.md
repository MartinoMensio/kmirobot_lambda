# kmirobot lambda

This repo contains the lambda function for the alexa skill.

The server is reachable using [ultrahook](http://www.ultrahook.com). The lambda function only acts as a bridge, handling possible errors.

## Upload the lambda function

- Create the zip file `make zip`
- Go to AWS lambda -> function code -> upload a .zip file