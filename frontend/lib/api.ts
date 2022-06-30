import axios from "axios"
import type { Point } from "lib/types"

const getPoints = async (): Promise<Point[]> => {
  const result = await axios.get("/api/points")
  if (result.status != 200) {
    throw new Error()
  }
  return result.data
}

export { getPoints }
