#!/usr/bin/env python

from dataclasses import dataclass
import json
import os
from typing import Iterator
import apsw

from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import GeoNames
from loguru import logger
from tqdm import tqdm
from tenacity import retry, stop_after_attempt, wait_fixed


def myretry(**overrides):
    kwargs = {"stop": stop_after_attempt(20), "wait": wait_fixed(1)} | overrides
    return retry(**kwargs)


@dataclass
class Repo:
    db: str

    def __post_init__(self):
        self._con = apsw.Connection(self.db)

    def _cursor(self):
        return self._con.cursor()

    @myretry()
    def n_locations_to_geocode(self) -> int:
        ((total,),) = self._cursor().execute(
            """
                select count(distinct text)
                from ner_results
                where text not in (select location_text from geocode)
            """
        )
        return total

    @myretry()
    def iter_locations(self) -> Iterator[str]:
        yield from self._cursor().execute(
            """
                select text from ner_results
                where text not in (select location_text from geocode)
                group by text
                order by count(*) desc
            """
        )

    @myretry()
    def insert(self, location_text: str, geoname_id: str | int, response: str):
        with self._con:
            self._cursor().execute(
                "insert or ignore into locations_raw (id, response) values (?, ?)",
                [geoname_id, response],
            )
            self._cursor().execute(
                "insert into geocode (location_text, location_id) values (?, ?)",
                [location_text, geoname_id],
            )


api = GeoNames(os.environ["GEONAMES_USERNAME"])
geocode = RateLimiter(
    api.geocode,
    min_delay_seconds=3.6,
    max_retries=5,
)

repo = Repo("data/full.db")

for (text,) in tqdm(repo.iter_locations(), total=repo.n_locations_to_geocode()):
    try:
        loc = geocode(text)

        if loc is None:
            continue

        repo.insert(text, loc.raw["geonameId"], json.dumps(loc.raw))

    except KeyboardInterrupt:
        logger.info("Exiting")
        break

    except BaseException as e:
        logger.warning(f"Encountered exception: {e}")
