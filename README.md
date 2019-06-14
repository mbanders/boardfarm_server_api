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
1. You need a mongodb to store data. Specify the username and password as environment variables:
    ```sh
    export MONGO_USER="myuser"
    export MONGO_PASS="mypass"
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
