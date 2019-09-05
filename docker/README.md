# Docker config

We're using `docker compose`, which runs 3 containers including the [Connection-Manager web app](https://github.com/modusbox/connection-manager-ui), [Connection-Manager API server](../server), and a mysql instance.


## Local dev environment

```bash
docker-compose build
docker-compose up -d
```

If you want to start the app listening on port 80:

`docker-compose -f docker-compose.yml -f docker-compose-80.yml up -d`

If you want to start the app with auth enabled:

`docker-compose -f docker-compose.yml -f docker-compose-auth.yml up`
