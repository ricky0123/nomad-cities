import type { NextApiRequest, NextApiResponse } from "next"
import { Repo } from "lib/repo"
import type { Point } from "lib/types"

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Point[]>
) {
  const repo = new Repo()
  const cities = repo.listCities()
  const maxMentions = Math.max(...cities.map((city) => city.mentions))
  const out = cities.map((city) => {
    return {
      ...city,
      popularityIndex: city.mentions / maxMentions,
    }
  })

  res.status(200).json(out)
}
