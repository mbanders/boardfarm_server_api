FROM node:8

WORKDIR /usr/src/boardfarm_server_api
COPY . .
RUN npm install

# TODO: mongodb link?

EXPOSE 5001

CMD [ "node", "index.js" ]
