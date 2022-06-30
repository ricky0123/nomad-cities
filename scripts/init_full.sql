
create table if not exists comments_raw (
    response text,
    id text primary key,
    check(json_valid(response))
);

create table if not exists ner_models (
    id text primary key,
    description text,
    created timestamp default current_timestamp
);

create table if not exists ner_results (
    text text,
    start integer,
    end integer,
    comment_id text,
    ner_model_id text,
    foreign key(ner_model_id) references ner_models(id),
    foreign key(comment_id) references comments(id),
    unique(comment_id, ner_model_id, start, end)
);

create table if not exists locations_raw (
    id text primary key, -- geonameid
    response text
    check(json_valid(response))
);

create table if not exists geocode (
    location_text text,
    location_id text,
    unique(location_text),
    foreign key(location_id) references locations_raw(id)
);

