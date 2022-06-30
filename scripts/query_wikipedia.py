# NOT USED ANYMORE

from dataclasses import dataclass
from time import sleep
from typing import Iterator
import apsw
import os
import requests
from tenacity import retry, stop_after_attempt, wait_fixed
from tqdm import tqdm
from loguru import logger


def myretry(**overrides):
    kwargs = {"stop": stop_after_attempt(20), "wait": wait_fixed(0.01)} | overrides
    return retry(**kwargs)


@dataclass
class Repo:
    db: str = "data/frontend.db"

    def __post_init__(self):
        self._con = apsw.Connection(self.db)

    def _cursor(self):
        return self._con.cursor()

    @myretry()
    def iter_cities(self) -> Iterator[tuple[str, str]]:
        yield from self._cursor().execute(
            "select id, city from cities where wiki_link is null order by mentions desc"
        )

    @myretry()
    def n_cities(self) -> int:
        ((total,),) = self._cursor().execute("select count(*) from cities where wiki_link is null")
        return total

    @myretry()
    def insert_wiki_info(self, id: str, summary: str, link: str):
        self._cursor().execute(
            """
                update cities
                set
                    wiki_summary = ?,
                    wiki_link = ?
                where
                    id = ?
            """,
            [summary, link, id],
        )


@dataclass
class WikiApi:
    user_agent: str = os.environ.get("USER_AGENT", "")

    def __post_init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

    @myretry(stop=stop_after_attempt(3))
    def query(self, city: str):
        response = self.session.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{city}"
        )
        if response.status_code != 200:
            logger.info(f"Status code {response.status_code} when querying {city}")
        response.raise_for_status()
        body = response.json()
        if body["type"] == "standard":
            return body["extract_html"], body["content_urls"]["desktop"]["page"]
        return None


if __name__ == "__main__":
    repo = Repo()
    api = WikiApi()

    for id, city in tqdm(repo.iter_cities(), total=repo.n_cities()):
        sleep(0.006)  # 200 request/second limit
        try:
            if (res := api.query(city)) is not None:
                html, link = res
                repo.insert_wiki_info(id, html, link)
        except KeyboardInterrupt:
            logger.info("exiting")
            break
        except Exception as e:
            logger.info(f"Encountered exception: {e}")
