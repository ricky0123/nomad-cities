import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  CloseButton,
  Flex,
  Grid,
  GridItem,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react"
import { interpolateWarm } from "d3-scale-chromatic"
import * as api from "lib/api"
import type { Point } from "lib/types"
import dynamic from "next/dynamic"
import Head from "next/head"
import Script from "next/script"
import React, { useEffect, useRef, useState } from "react"

const MyGlobe = dynamic(() => import("../components/Globe"), { ssr: false })
const ForwardedRefGlobe = React.forwardRef((props: any, ref) => (
  <MyGlobe {...props} forwardedRef={ref} />
))

export enum OverlayContentType {
  INSIGHTS = "insights",
  NONE = "none",
}

interface Coords {
  lat: number
  lng: number
}

const LoadingFailedAlert = (
  retryLoadPointsCounter,
  setRetryLoadPointsCounter
) => {
  const {
    isOpen: isOpenLoadingFailedAlert,
    onOpen: onOpenLoadingFailedAlert,
    onClose: onCloseLoadingFailedAlert,
  } = useDisclosure()
  const cancelRef = React.useRef()

  const retry = () => {
    onCloseLoadingFailedAlert()
    setRetryLoadPointsCounter(retryLoadPointsCounter + 1)
  }

  const LoadingFailedAlertComponent = () => {
    return (
      <AlertDialog
        isOpen={isOpenLoadingFailedAlert}
        leastDestructiveRef={cancelRef}
        onClose={onCloseLoadingFailedAlert}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="rgba(44,50,59,0.8)" borderRadius={0}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Unable to retrieve data.
            </AlertDialogHeader>

            <AlertDialogBody>Try again?</AlertDialogBody>

            <AlertDialogFooter>
              <Button
                variant="solid"
                ref={cancelRef}
                onClick={onCloseLoadingFailedAlert}
              >
                No
              </Button>
              <Button variant="solid" onClick={retry} ml={3}>
                Yes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    )
  }
  return { onOpenLoadingFailedAlert, LoadingFailedAlertComponent }
}

const App = () => {
  return <IndexDocument child={<AppContent />} />
}

function AppContent() {
  const [pointsData, setPointsData] = useState<Point[] | null>(null)
  const [contentType, setContentType] = useState<OverlayContentType>(
    OverlayContentType.NONE
  )
  const [pov, setPOV] = useState<Coords | null>(null)
  const globeEl = useRef(null)
  const [retryLoadPointsCounter, setRetryLoadPointsCounter] =
    useState<number>(0)
  const { onOpenLoadingFailedAlert, LoadingFailedAlertComponent } =
    LoadingFailedAlert(retryLoadPointsCounter, setRetryLoadPointsCounter)
  const windowSize = useWindowSize()
  const overlayDisclosure = useDisclosure()

  useEffect(() => {
    async function getpointsData() {
      try {
        const points = await api.getPoints()
        setPointsData(points)
      } catch (error) {
        onOpenLoadingFailedAlert()
      }
    }
    getpointsData()
  }, [retryLoadPointsCounter])

  useEffect(() => {
    if (globeEl.current && pov.lat) {
      globeEl.current?.pointOfView({ lat: pov.lat - 7, lng: pov.lng - 7 }, 1000)
    }
  }, [pov])

  const onPointClick = (point, event, { lat, lng, altitude }) => {
    setPOV({ lat, lng })
  }

  return (
    <Box backgroundColor="#000000" minW="100vw" minH="100vh">
      <Box position="absolute" width="100%" height="100%">
        <Grid
          position="absolute"
          width="100%"
          zIndex={1}
          top="20px"
          gridTemplateColumns="1fr auto 1fr"
          justifyItems="center"
        >
          <GridItem marginRight="auto" marginLeft="20px">
            <Button
              onClick={() => {
                setContentType(OverlayContentType.INSIGHTS)
                overlayDisclosure.onOpen()
              }}
            >
              Top Cities
            </Button>
          </GridItem>
        </Grid>

        <Box position="absolute" top={0} zIndex={0}>
          <ForwardedRefGlobe
            ref={globeEl}
            // https://github.com/vasturiano/three-globe/tree/master/example/img
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            // bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            pointsData={pointsData}
            pointColor={() => "#00ff9f"}
            pointAltitude={(point) => point.popularityIndex * 0.8}
            onPointClick={onPointClick}
            width={windowSize.width}
            height={windowSize.height}
            pointLabel={(point) => `${point.city}, ${point.countryName}`}
          />
        </Box>
      </Box>

      <MyModal
        disclosure={overlayDisclosure}
        points={pointsData}
        contentType={contentType}
      />

      <LoadingFailedAlertComponent />
    </Box>
  )
}

const IndexDocument = ({ child }) => {
  return (
    <div>
      <Head>
        <title>Spiky</title>
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      {child}

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-TS3KK6WCBX"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-TS3KK6WCBX', { 'anonymize_ip': true });
        `}
      </Script>
    </div>
  )
}

const MyModal = ({ points, contentType, disclosure }) => {
  switch (contentType) {
    case OverlayContentType.INSIGHTS:
      return (
        <ModalLayout
          disclosure={disclosure}
          header="Top Cities"
          content={<Insights points={points} />}
        />
      )
  }
}

const ModalLayout = ({ header, content, disclosure }) => {
  return (
    <Modal
      size="full"
      onClose={disclosure.onClose}
      isOpen={disclosure.isOpen}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent
        borderRadius={0}
        bg="rgba(0,0,0,0.8)"
        // borderColor='#001eff' //'gray.800'
        // borderWidth={1}
      >
        <ModalHeader>
          <Flex align="center">
            <Heading bgGradient="linear(to-l, #7928CA, #FF0080)" bgClip="text">
              {header}
            </Heading>
            <Spacer />
            <CloseButton
              _hover={{
                color: "#d600ff",
              }}
              borderRadius={0}
              _focus={{ boxShadow: "none" }}
              onClick={disclosure.onClose}
            />
          </Flex>
        </ModalHeader>
        <ModalBody>{content}</ModalBody>
      </ModalContent>
    </Modal>
  )
}

interface InsightsProps {
  points: Point[] | null
}

const Insights = ({ points }: InsightsProps) => {
  const TopMentioned = () => {
    points.sort((a, b) => {
      return b.popularityIndex - a.popularityIndex
    })
    const top = points.slice(0, 100)
    return (
      <TableContainer>
        <Table variant="unstyled">
          <Thead>
            <Tr color="#d600ff">
              <Th>Rank</Th>
              <Th>City</Th>
              <Th>Country</Th>
              <Th>Mentions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {top.map((point, i) => {
              const c = interpolateWarm(1 - i / 99)
              return (
                <Tr _hover={{ bgColor: "rgb(0, 30, 255, .35)" }} key={point.id}>
                  <Td color={c}>{i + 1}</Td>
                  <Td>{point.city}</Td>
                  <Td>{point.countryName}</Td>
                  <Td>{point.mentions}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableContainer>
    )
  }

  return <div>{points === null ? <div /> : <TopMentioned />}</div>
}

// copied from pislagz's spacex-live (MIT license)
// https://github.com/pislagz/spacex-live/blob/6ba8ad32fd0286914946faf6491b69f29ed758a6/src/app/hooks/useWindowSize.js#L4
const useWindowSize = () => {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  })
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    // Add event listener
    window.addEventListener("resize", handleResize)
    // Call handler right away so state gets updated with initial window size
    handleResize()
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize)
  }, []) // Empty array ensures that effect is only run on mount
  return windowSize
}

export default App
