import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Button, Center, Spinner, Text, VStack, Popover, Portal, Link } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { fetchCampusNotices } from './fetchCampusNotices'

export function AfterLogin() {
  const auth = useAuth()
  const [data, setData] = useState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!auth.user.id) return

    let sessionActivated = false

    ;(async () => {
      sessionActivated = await activateSession(auth.user)
      if (sessionActivated) {
        await fetchCampusNotices();
        setLoading(false)
      }
    })()

    return () => {
      if (sessionActivated) deactivateSession()
    }
  }, [auth.user])

  if (loading) {
    return (
      <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
        <VStack>
          <Spinner size="xl" />
          <Text mt={4}>掲示板を取得中</Text>
        </VStack>
        <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
      </Center>
    )
  }

  if (error) {
    return (
      <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
        <Text color="red.500" mb={4} textAlign="center">{error}</Text>
        <Button variant='solid' onClick={auth.logout}>ログアウト</Button>
      </Center>
    )
  }

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
      <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
    </Center>
  )
}