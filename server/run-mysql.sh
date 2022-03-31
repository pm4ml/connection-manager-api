echo "Starting DB..."

DATABASE_ROOT_PASSWORD=${DATABASE_ROOT_PASSWORD:="mcm"}
DATABASE_USER=${DATABASE_USER:="mcm"}
DATABASE_PASSWORD=${DATABASE_PASSWORD:="mcm"}
DATABASE_SCHEMA=${DATABASE_SCHEMA:="mcm"}
DATABASE_TAG=${DATABASE_TAG:-"8"}

echo "\nStarting DB - creating init script - /tmp/init.sql"

echo "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;" > /tmp/init.sql

echo "\nStarting DB - wait-for-db script - /tmp/wait-for-db.sh"

echo "
  echo -n 'Waiting for $DATABASE_SCHEMA DB to startup';
  echo -n '' && sleep 2; 
  while ! mysql --protocol=tcp -u root --password=$DATABASE_ROOT_PASSWORD $DATABASE_SCHEMA -ss -N -e 'select 1'  > /dev/null 2>&1;
  do 
    echo -n '.' && sleep 2; 
  done;
  echo;
  echo 'Successfully connected to $DATABASE_SCHEMA DB!';
" > /tmp/wait-for-db.sh

echo "\nStarting DB - starting docker"

docker run -d --rm --name mysql-mbox-mcm -p 3306:3306 -e MYSQL_ROOT_PASSWORD=$DATABASE_ROOT_PASSWORD -e MYSQL_USER=$DATABASE_USER -e MYSQL_PASSWORD=$DATABASE_PASSWORD -e MYSQL_DATABASE=$DATABASE_SCHEMA -v "/tmp/init.sql:/docker-entrypoint-initdb.d/init.sql" -v "/tmp/wait-for-db.sh:/tmp/wait-for-db.sh" mysql:$DATABASE_TAG

echo "\nStarting DB - waiting for DB to startup..."

docker exec -it mysql-mbox-mcm bash /tmp/wait-for-db.sh

echo "\nStarting DB - running 'npm run migrate-and-seed' to initialise database and seeds..."

npm run migrate-and-seed

echo "\nStarting DB - done!"
