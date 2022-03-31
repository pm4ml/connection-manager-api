echo 'CREATE DATABASE mcm;' > /tmp/init.sql

docker run -d --rm --name mysql-mbox-mcm -p 3306:3306 -e MYSQL_ROOT_PASSWORD=mcm -v "/tmp/init.sql:/docker-entrypoint-initdb.d/init.sql" mysql:8
