FROM node:20-buster

# APP
WORKDIR /usr/src/app

ARG API_BUILD
ENV API_BUILD=$API_BUILD

ARG API_COMMIT
ENV API_COMMIT=$API_COMMIT

ARG API_DESCRIBE
ENV API_DESCRIBE=$API_DESCRIBE

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci --only=prod

# My app sources
COPY . .

EXPOSE 3001

# run!
CMD ["npm", "start"]
