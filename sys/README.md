# Production Setup
Systemd is an easy way to manage running this web application on a linux system. Here's how to set things up.

## Setup

Tested on Ubuntu 18.

1. Modify the file `bfapi.service` to contain your settings for your mongodb:
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
