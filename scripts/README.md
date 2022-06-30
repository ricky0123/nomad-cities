Run all from top level directory with poetry environment activated.

1. Create database with
    ```sh
    sqlite3 data/full.db < scripts/init_full.sql
    ```
1. Download comments with
    ```sh
    python scripts/download_comments.py
    ```
1. NER
    ```sh
    python -m spacy download en_core_web_lg

    sqlite3 -list -batch data/full.db "
        select json_object('text', response ->> '$.body', 'id', response ->> '$.id')
        from comments_raw
    " | tail -n +2 | python ./scripts/run_ner.py \
        --model=en_core_web_lg \
        --model-description='en_core_web_lg'
    ```
1. Geocode
    ```sh
    python scripts/geocode.py
    ```
1. Create deployment db
    ```sh
    sqlite3 data/frontend.db < scripts/init_frontend.sql

    sqlite3 data/full.db "
        attach 'data/frontend.db' as frontend;

        insert into frontend.cities (id, city, country_name, lat, lng, mentions)
        select
            l.id as id,
            l.response ->> '$.name' as city,
            l.response ->> '$.countryName' as country_name,
            l.response ->> '$.lat' as lat,
            l.response ->> '$.lng' as lng,
            count(*) as mentions
        from
            locations_raw as l left join
            geocode as m on l.id = m.location_id left join
            ner_results as r on m.location_text = r.text
        where l.response ->> '$.fcl' = 'P'
        group by l.id;
    "
    ```
