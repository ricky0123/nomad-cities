
create table if not exists cities (
    id text primary key,
    city text,
    country_name text,
    lat real,
    lng real,
    mentions integer
);
