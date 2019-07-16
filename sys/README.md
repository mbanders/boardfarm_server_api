# Production Setup
Systemd is an easy way to manage running this web application on a linux system. Another option is running with docker, for those who prefer it.

## Setup with Systemd

I recommend running with systemd. These instructions are for Ubuntu.

1. Modify the file `sys/bfapi.service` to contain your settings for your mongodb:
    ```[Service]
    Environment="MONGO_USER=yourmongouser"
    Environment="MONGO_PASS=yourmongopass"
    Environment="MONGO_SERVER=localhost"
    ```
1. Also change the username and directory path:
    ```
    User=youruser
    ExecStart=/path/to/boardfarm_server_api/index.js
    ```
1. Copy the service file:
    ```sh
    sudo cp bfapi.service /lib/systemd/system/
    ```
1. Reload:
    ```sh
    sudo systemctl daemon-reload
    ```
1. Start the app:
    ```sh
    sudo systemctl start bfapi
    ```
1. Check the status to see if it is running:
    ```sh
    sudo journalctl -u bfapi
    ```
1. Enable it to automatically run on boot:
    ```sh
    sudo systemtl enable bfapi
    ```
1. You should be able to visit your web app at http://localhost:5001/api

## Setup with Docker

Another way to run this app is with docker. If you choose to use docker, here's how to set that up.

1. Start and setup your mongodb docker container (unless you have it setup somewhere else)
    ```sh
    docker run -d -e MONGO_INITDB_ROOT_USERNAME=$adminuser \
        -e MONGO_INITDB_ROOT_PASSWORD=$adminpass -p 27017:27017 \
        --name mongodb mongo:latest
    docker exec -it mongodb mongo -u $adminuser -p $adminpass \
         --eval "db.createUser({ user:'$bftuser', pwd:'$bftpass', roles:[ { role:'readWrite', db:'test' } ] })"
1. Build the docker container for this project:
    ```sh
    docker build -t bft:server_api .
    ```
1. Start the docker container:
    ```sh
    docker run -e MONGO_USER=$bftuser \
        -e MONGO_PASS=$bftpass -e MONGO_SERVER=$mongodbserver \
        -p 80:5001 bft:server_api
    ```
