# kmirobot lambda

This repo contains the lambda function for the alexa skill.

The lambda function only acts as a bridge, handling possible errors.

## Upload the lambda function

- Create the zip file `make zip`
- Go to AWS lambda -> function code -> upload a .zip file

## Expose server

This lambda interacts with the server that sends the commands to the physical robot. The server may be running on a development machine behind NATs and firewalls.

Some possible solutions to make it reachable from the internet are:

- [ultrahook](http://www.ultrahook.com/): free, custom name can be used, but no responses are forwarded back, it always sends a 200 with an empty body. It can be installed as a ruby gem.
- [localtunnel](https://localtunnel.github.io/www/): free, custom name can be used, but it seems not to be working. Can be installed using `npm`.
- [ngrok](https://ngrok.com/): custom name requires paying, otherwise each time the subdomain changes. Installable for many platforms.
- [serveo](http://serveo.net/): free, custom name. No installation required, launch with a `ssh` command.

The solution adopted is to use serveo. The command is:

```bash
ssh -R <SUBDOMAIN>:80:localhost:<PORT> serveo.net
```

and it will be possible to be reachable via `https://<SUBDOMAIN>.serveo.net`