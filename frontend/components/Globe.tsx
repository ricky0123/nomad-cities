import React from "react"
import Globe from "react-globe.gl"

export const MyGlobe = ({ forwardedRef, ...rest }) => {
  return <Globe {...rest} ref={forwardedRef} />
}

export default MyGlobe
