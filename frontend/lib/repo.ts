import Database from "better-sqlite3"
import { join } from "path"

interface City {
  id: string
  city: string
  countryName: string
  lat: number
  lng: number
  mentions: number
}

class Repo {
  private db: Database.Database

  constructor() {
    const dbPath = join(process.cwd(), "frontend.db")
    this.db = new Database(dbPath)
  }

  listCities(): City[] {
    const rawCities = this.db
      .prepare(
        `
            select
                id, city, country_name, lat, lng, mentions
            from cities
        `
      )
      .all()
    return rawCities.map((rawCity) => {
      const { country_name: countryName, ...rest } = rawCity
      return { countryName, ...rest }
    })
  }
}

export { Repo }
