#!/usr/bin/env python3.10

import json
from uuid import uuid4

import apsw
import click
import spacy
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_fixed
from tqdm import tqdm


def myretry(**overrides):
    kwargs = {"stop": stop_after_attempt(20), "wait": wait_fixed(1)} | overrides
    return retry(**kwargs)


def get_connection():
    return apsw.Connection("./data/full.db")


@myretry()
def create_model(con: apsw.Connection, description: str | None) -> str:
    model_id = str(uuid4())
    con.cursor().execute(
        "insert into ner_models (id, description) values (?, ?)",
        [model_id, description],
    )
    return model_id


@myretry()
def comments_iter(con: apsw.Connection):
    return con.cursor().execute(
        "select response ->> '$.id', response ->> '$.body' from comments_raw"
    )


@myretry()
def total_comments(con: apsw.Connection):
    (total,) = con.cursor().execute("select count(*) from comments_raw").fetchone()
    assert isinstance(total, int)
    return total


@myretry()
def insert_ner_result(
    con: apsw.Connection,
    model_id: str,
    comment_id: str,
    text: str,
    start: int,
    end: int,
):
    con.cursor().execute(
        """
            insert into ner_results (
                text, start, end, comment_id, ner_model_id
            ) values (?, ?, ?, ?, ?)
        """,
        [text, start, end, comment_id, model_id],
    )


@click.command()
@click.option("--model-description", default=None)
@click.option("--model", default="en_core_web_lg")
def main(model: str, model_description: str):

    stdin = click.get_text_stream("stdin")
    lines = list(stdin)

    con = get_connection()
    nlp = spacy.load(model)
    model_id = create_model(con, model_description)

    for line in tqdm(lines, total=len(lines)):
        try:
            obj = json.loads(line)
            comment_id, body = obj["id"], obj["text"]

            doc = nlp(body)

            for ent in doc.ents:
                if ent.label_ == "GPE":
                    with con:
                        insert_ner_result(
                            con,
                            model_id,
                            comment_id,
                            ent.text,
                            ent.start_char,
                            ent.end_char,
                        )
        except KeyboardInterrupt:
            logger.info("Exiting.")
            break


if __name__ == "__main__":
    main()
