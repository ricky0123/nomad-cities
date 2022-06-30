# Nomad Cities

> [www.spikynomadball.com](https://www.spikynomadball.com)

Web app showing the most mentioned cities on [r/digitalnomad](https://www.reddit.com/r/digitalnomad).

See [scripts/README.md](./scripts/README.md) to see how data was downloaded and processed.

## Method and Limitations

City mentions were identified by running a [Spacy model](https://spacy.io/models/en#en_core_web_lg) on comments to determine ranges of text referring to geopolitical entities, and then querying [Geonames](geonames.org/) for that text. Both steps, but especially the first, contain errors. The number of mentions and ranking of cities will change if the Spacy model is improved. Only comments were scanned, not posts.

The data includes comments from the beginning of the subreddit until around June 9, 2022. I realized after downloading the data from [pushshift](https://github.com/pushshift/api) that pushshift can contain multiple comments with the same comment id, probably due to comment edits. My data only includes one entry for each comment id.

## Credits
* [react-globe.gl](https://github.com/vasturiano/react-globe.gl)
* Favicon [icon](https://icons8.com/icon/1301/globe) from [icons8.com](https://icons8.com)
* Lifted some code from [pislagz/spacex-live](https://github.com/pislagz/spacex-live)
