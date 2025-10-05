import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Box, Button, Center, Spinner, Text, VStack, HStack, Badge, Container, Heading } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { updateKeijiData } from './updateKeijiData'
import { getKeijiData, type KeijiData } from './sqlDatabase'

export function AfterLogin() {
  const auth = useAuth()
  const [keijiData, setKeijiData] = useState<KeijiData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!auth.user.id) return
    let sessionActivated = false

    const loadData = async () => {
      try {
        const existingData = await getKeijiData()
        setKeijiData(existingData)
        setLoading(false)

        sessionActivated = await activateSession(auth.user)
        if (sessionActivated) {
          setUpdating(true)
          try {
            await updateKeijiData()
            const updatedData = await getKeijiData()
            setKeijiData(updatedData)
          } catch (error) {
            console.warn('掲示データの更新に失敗しました:', error)
          } finally {
            setUpdating(false)
          }
        }
      } catch {
        setError('掲示データの取得に失敗しました')
        setLoading(false)
      }
    }

    loadData()
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="container.xl" py={6}>
        <HStack justify="space-between" mb={6}>
          <HStack>
            <Heading size="lg">HatuMiMi</Heading>
            {updating && (
              <HStack gap={2} color="blue.500">
                <Spinner size="sm" />
                <Text fontSize="sm">更新中...</Text>
              </HStack>
            )}
          </HStack>
          <Button variant='solid' onClick={auth.logout}>ログアウト</Button>
        </HStack>

        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden" h="calc(100vh - 160px)" display="flex" flexDirection="column">
          <Box p={4} borderBottom="1px" borderColor="gray.200" bg="gray.100">
            <Text fontWeight="bold">掲示一覧 ({keijiData.length}件)</Text>
          </Box>
          <Box overflowY="auto" flex="1">
            {keijiData.length === 0 ? (
              <Center p={8}>
                <Text color="gray.500">掲示がありません</Text>
              </Center>
            ) : (
              <VStack gap={0} w="full">
                {keijiData.map((item) => (
                  <Box key={item.id} p={4} borderBottom="1px" borderColor="gray.200" _hover={{ bg: 'gray.50' }} w="full">
                    <VStack alignItems="start" gap={2}>
                      <HStack justify="space-between" w="full">
                        <Badge colorScheme="blue" fontSize="xs">{item.genre_name}</Badge>
                        <Text fontSize="xs" color="gray.500">{formatDate(item.published_at)}</Text>
                      </HStack>
                      <Text fontWeight="semibold" fontSize="sm" lineHeight="short">{item.title}</Text>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}