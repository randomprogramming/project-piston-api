# Seeding Data

This folder is used for processing and loading data for DB seeding.

-   `locations.ts` - For seeding cities and countries in the database. It uses the cities500.txt file for the data, which is downloaded from `http://download.geonames.org/export/dump/`. Also uses alternateNames.txt file to find the "local" name for each city. The files are downloaded when the script is ran because they're pretty large
