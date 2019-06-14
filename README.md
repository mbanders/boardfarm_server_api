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
