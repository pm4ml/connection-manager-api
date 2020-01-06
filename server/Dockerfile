FROM node:8.15-jessie

# Install cfssl 
RUN apt-get -y install wget

RUN wget https://dl.google.com/go/go1.12.1.linux-amd64.tar.gz -q -O - | tar -zxf - -C /usr/local

# golang env
ENV GOPATH /go
ENV GOROOT /usr/local/go

ENV PATH $PATH:$GOROOT/bin:$GOPATH/bin/

# Install cfssl with Go and clean up
RUN rm -rf $GOPATH/src/github.com/cloudflare/cfssl

# WARNING: The next layer will be cached, it won't be re-fetched even if the tag changes on the github repo.
RUN git clone https://github.com/modusintegration/cfssl.git --branch=v1.3.4 $GOPATH/src/github.com/cloudflare/cfssl

# If we want to fetch latest from master, we need disable cache from this layer on
# To do this run docker build --no-cache
# Or pass a different value to CACHEBUST like --build-arg CACHEBUST=$(date +%s) and enable the commented out lines below
# as in docker-compose build --build-arg CACHEBUST=$(date +%s)
# ARG CACHEBUST=none
# RUN git clone https://github.com/modusintegration/cfssl.git $GOPATH/src/github.com/cloudflare/cfssl

WORKDIR $GOPATH/src/github.com/cloudflare/cfssl
# home made: build locally
RUN make
RUN ls -l bin
RUN cp bin/* /usr/bin
# clean up
RUN rm -rf ${GOROOT} ${GOPATH} 

# There are some other alternatives, check
# https://github.com/modusintegration/cfssl/blob/master/Dockerfile
# For a minimal version see https://github.com/modusintegration/cfssl/blob/master/Dockerfile.minimal

# Check cfssl version
RUN which cfssl
RUN cfssl version

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

RUN npm install

# My app sources
COPY . .

EXPOSE 3001

# run!
CMD ["npm", "start"]
