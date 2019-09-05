FROM alpine

# install openssl
RUN apk add --update openssl && \
    rm -rf /var/cache/apk/*

# install JQ
RUN apk update \
 && apk add jq \
 && rm -rf /var/cache/apk/*

# install curl
RUN apk add --update curl && \
    rm -rf /var/cache/apk/*

# install oh my zsh
RUN apk add --update zsh git
RUN sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
RUN echo "export PROMPT=Docker$PROMPT" >> ~/.zshrc
ENTRYPOINT ["/bin/zsh"]

COPY smoke-clean-tester.sh /tmp

CMD ["-c","/tmp/smoke-clean-tester.sh"]
