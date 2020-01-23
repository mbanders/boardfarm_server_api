# Production Setup
Systemd is an easy way to manage running this web application on a linux system. Another option is running with docker, for those who prefer it.

## Quick setup of MongoDb

It's better to follow other, updated instructions, but if you just need to do it quickly:

1. Install mongo:
    ```sh
    sudo apt update
    sudo apt install -y mongodb
    ```
1. Check mongo status. This should show running and you can connect and see the mongo version:
    ```sh
    sudo systemctl status mongodb
    mongo --eval 'db.runCommand({ connectionStatus: 1 })'
    ```
1. Create a user:
    ```sh
    # Connect to your mongo database
    mongo
    # Create user
    db.createUser({ user:'someuser', pwd:'somepassword', roles:[ { role:'readWrite', db:'boardfarm' } ] })
    ```

That's it, press CTRL-D to exit.

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
1. You should be able to visit your web app at http://localhost:5001/api

Extra commands:

```sh
# Check status
sudo systemctl status bfapi
# See log files
sudo journalctl -u bfapi
# Eanble to automatically run on boot:
sudo systemctl enable bfapi
# Stop the app
sudo systemctl stop bfapi
# Restart the app
sudo systemctl restart bfapi
```

## Setup with Docker

Another way to run this app is with docker. If you choose to use docker, here's how to set that up.

1. Start and setup your mongodb docker container (unless you have it setup somewhere else)
    ```sh
    docker run -d -e MONGO_INITDB_ROOT_USERNAME=$adminuser \
        -e MONGO_INITDB_ROOT_PASSWORD=$adminpass -p 27017:27017 \
        --name mongodb mongo:latest
    docker exec -it mongodb mongo -u $adminuser -p $adminpass \
         --eval "db.createUser({ user:'$bftuser', pwd:'$bftpass', roles:[ { role:'readWrite', db:'boardfarm' } ] })"
1. Build the docker container for this project:
    ```sh
    docker build -t bft:server_api .
    ```
1. Start the docker container:
    ```sh
    docker run -e MONGO_USER=$bftuser \
        -e MONGO_PASS=$bftpass -e MONGO_SERVER=$mongodbserver \
        -p 5001:5001 bft:server_api
    ```
1. You should be able to visit your web app at http://localhost:5001/api

