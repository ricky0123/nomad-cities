#!/usr/bin/env python3.10

from functools import partial
import json
from datetime import datetime, timedelta
from time import sleep
from typing import Literal

import apsw
import click
import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_fixed
from tqdm import tqdm

base_url = "https://api.pushshift.io/reddit/search/comment"


def myretry(**overrides):
    kwargs = {"stop": stop_after_attempt(20), "wait": wait_fixed(1)} | overrides
    return retry(**kwargs)


def pretty_epoch_string(epoch: int) -> str:
    return datetime.fromtimestamp(epoch).strftime("%c")


@myretry()
def get_total_comments(
    url: str = base_url,
    after: str | None = None,
    before: str | None = None,
) -> int:
    params = {
        "subreddit": "digitalnomad",
        "after": after,
        "before": before,
        "metadata": True,
        "size": 0,
    }

    req = requests.get(url, params=params)
    req.raise_for_status()

    resp = req.json()
    n_comments = resp["metadata"]["total_results"]
    return n_comments


@myretry(wait=wait_fixed(5))
def get_comments(
    url: str = base_url,
    size: int = 100,
    after: str | None = None,
    before: str | None = None,
    sort: Literal["asc", "desc"] = "desc",
):
    params = {
        "subreddit": "digitalnomad",
        "size": size,
        "after": after,
        "before": before,
        "sort": sort,
    }
    req = requests.get(url, params=params)
    req.raise_for_status()
    resp = req.json()
    assert set(resp.keys()) == {"data"}
    return resp["data"]


@myretry()
def earliest_saved_epoch(con: apsw.Connection):
    ((min_created_utc,),) = con.cursor().execute(
        "select min(response ->> '$.created_utc') from comments_raw"
    )
    return min_created_utc


@myretry()
def insert_comment(con: apsw.Connection, comment: dict):
    con.cursor().execute(
        "insert into comments_raw (id, response) values (?, ?)",
        [comment["id"], json.dumps(comment)],
    )


@myretry()
def id_is_new(con: apsw.Connection, i: str):
    res = (
        con.cursor().execute("select id from comments_raw where id = ?", [i]).fetchone()
    )
    return res is None


def get_connection(path: str = "data/full.db"):
    con = apsw.Connection(path)
    return con


@click.command()
@click.option("--db", default="data/full.db")
@click.option("--size", default=100)
def main(db: str, size: int):
    assert size <= 100, "Size must be <= 100"

    con = get_connection(db)

    min_created_utc = earliest_saved_epoch(con)

    n_comments = get_total_comments(base_url, before=min_created_utc)
    n_calls = n_comments // size + 1

    target_iteration_time = timedelta(seconds=0.6)

    before = min_created_utc + 1 if min_created_utc is not None else None
    for _ in tqdm(range(10 * n_calls), total=n_calls):
        try:
            iteration_start = datetime.now()

            comments = get_comments(before=before, size=size)
            if not comments:
                logger.info("No comments returned. Exiting.")
                break

            ids = [c["id"] for c in comments]
            if not any(id_is_new(con, i) for i in ids):
                before = min(c["created_utc"] for c in comments)
                continue

            for c in comments:
                if id_is_new(con, c["id"]):
                    insert_comment(con, c)

            before = comments[-1]["created_utc"] + 1

            # https://api.pushshift.io/meta -> server_ratelimit_per_minute = 120
            iteration_time_elapsed = datetime.now() - iteration_start
            if iteration_time_elapsed < target_iteration_time:
                sleep((target_iteration_time - iteration_time_elapsed).total_seconds())

        except KeyboardInterrupt:
            logger.info("Exiting.")
            break


if __name__ == "__main__":
    main()
