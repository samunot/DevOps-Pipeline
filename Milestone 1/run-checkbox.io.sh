

MONGO_PASSWORD="MonGoPaSsWoRd"

# create a docker network
NETWORK_NAME="cb_network"
docker network create $NETWORK_NAME

start mongo db server
docker run \
  --rm \
  --name cb_mongo \
  --network $NETWORK_NAME \
  --network-alias mongo \
  --env MONGODB_PASS="$MONGO_PASSWORD" \
  --detach \
  tutum/mongodb

# start checkbox.io
docker run \
  --rm \
  --name checkbox \
  --network $NETWORK_NAME \
  --network-alias checkbox \
  --publish-all \
  --env MONGO_PORT=27017 \
  --env MONGO_IP=mongo \
  --env MONGO_USER=admin \
  --env MONGO_PASSWORD=$MONGO_PASSWORD \
  --env MAIL_USER=itrustv2test \
  --env MAIL_PASSWORD=itrustnoone \
  --env MAIL_SMTP=smtp.gmail.com \
  --volume $PWD/server-side/site:/usr/src/app \
  --workdir /usr/src/app \
  --detach \
  node:9 \
  npm start

# start nginx
docker run \
  --name cb_nginx \
  --network $NETWORK_NAME \
  --network-alias nginx \
  --publish 80:80 \
  --volume $PWD/public_html:/usr/share/nginx/html \
  --volume $PWD/local-conf/nginx.conf:/etc/nginx/nginx.conf \
  --volume $PWD/local-conf/default:/etc/nginx/sites-available/default \
  --detach \
  nginx
