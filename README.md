# boardfarm_server_api
A REST API for checking out/in devices and seeing current status.

## Quick Start

Tested on Ubuntu 18.

1. Install node and npm:
    ```sh
    sudo apt update
    sudo apt install -y nodejs npm
    ```
1. Give node privileges to listen on low ports (like port 80) so it can be the webserver.
    ```sh
    sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
    ```
1. Clone this project and install needed libraries:
    ```sh
    git clone git@github.com:mbanders/boardfarm_server_api.git
    cd boardfarm_server_api/
    npm install
    ```
1. You need a mongodb to store data. Specify the username, password, and server hostname as environment variables:
    ```sh
    export MONGO_USER="myuser"
    export MONGO_PASS="mypass"
    export MONGO_SERVER="myserver"
    ```
    Then specify the mongodb connetion uri in the file `config.js`:
    ```js
    var user = process.env.MONGO_USER
    var pass = process.env.MONGO_PASS
    module.exports.mongodb_uri = `mongodb+srv://${user}:${pass}@boardfarm0-mgbyp.mongodb.net/test?retryWrites=true&w=majority`
    ```
1. Now start the server:
    ```sh
    node index.js
    ```
1. Open a web browser and visit `http://YourServer:Port/api`, be sure to replace "YourServer:Port" with the IP address (or hostname) and port of your server. You should see a message saying "Welcome".
1. Post your boardfarm configuration JSON file so that stations and devices are stored:
    ```sh
    curl -X POST \
         -H "Content-Type: application/json" \
         -d @boardfarm_config_example.json \
         http://YourServer:Port/api/bf_config
    ```
1. Visit `http://YourServer:Port/api/bf_config` to see the full boardfarm config file you just pushed. You will see some extra keys, that's ok.
1. Also visit `http://YourServer:Port/api/stations` and `http://YourServer:port/api/devices` to see the stations and the shareable devices.

## Rest API Desciription

All paths begin with `/api`.

| path | Method | Data Parameters | Response |
|------|--------|-----------------|----------|
| / | GET    | - | {"message": "Welcome to Boardfarm REST API","version": "X.Y.Z"} |
| /bf_config | GET | - | A JSON document formatted for for `bft` |
| /stations | GET | - | A JSON document describing all stations |
| /stations/\<name\> | GET  | - | A JSON document describing the station with a given name |
| /stations/\<name\> | POST | JSON containing fields and values to change |                                                                 
| /locations | GET    | - | A JSON document describing all locations |

### Running in docker container

    docker run -d -e MONGO_INITDB_ROOT_USERNAME=$adminuser \
        -e MONGO_INITDB_ROOT_PASSWORD=$adminpass -p 27017:27017 \
        --name mongodb mongo:latest
    docker exec -it mongodb mongo -u $adminuser -p $adminpass \
         --eval "db.createUser({ user:'$bftuser', pwd:'$bftpass', roles:[ { role:'readWrite', db:'test' } ], mechanisms:[ 'SCRAM-SHA-1' ] })"
    docker build -t bft:server_api .
    docker run -e MONGO_USER=$bftuser \
        -e MONGO_PASS=$bftpass -e MONGO_SERVER=$mongodbserver \
        -p 80:80 bft:server_api
