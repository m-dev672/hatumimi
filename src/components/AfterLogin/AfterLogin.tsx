import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { 
  Box, 
  Button, 
  Center, 
  Spinner, 
  Text, 
  VStack, 
  HStack,
  Badge,
  Container,
  Heading
} from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { updateKeijiData } from './updateKeijiData'
import { getKeijiData, type KeijiData } from './sqlDatabase'

export function AfterLogin() {
  const auth = useAuth()
  const [keijiData, setKeijiData] = useState<KeijiData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string>()
  const [selectedItem, setSelectedItem] = useState<KeijiData | null>(null)

  const bgColor = 'gray.50'
  const cardBg = 'white'
  const borderColor = 'gray.200'

  useEffect(() => {
    if (!auth.user.id) return

    let sessionActivated = false

    ;(async () => {
      try {
        // まず既存のデータベースから掲示データを即座に取得・表示
        const existingData = await getKeijiData();
        setKeijiData(existingData);
        setLoading(false);

        // セッションをアクティベートして新しいデータを取得（非同期）
        sessionActivated = await activateSession(auth.user)
        if (sessionActivated) {
          // バックグラウンドで掲示データを更新
          setUpdating(true);
          updateKeijiData().then(async () => {
            // 更新完了後、最新データを再取得して表示を更新
            const updatedData = await getKeijiData();
            setKeijiData(updatedData);
            setUpdating(false);
          }).catch(err => {
            console.warn('掲示データの更新に失敗しました:', err);
            setUpdating(false);
            // 更新に失敗しても既存データは表示し続ける
          });
        }
      } catch (err) {
        setError('掲示データの取得に失敗しました')
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="container.xl" py={6}>
        <HStack justify="space-between" mb={6}>
          <HStack>
            <Heading size="lg">掲示板メールボックス</Heading>
            {updating && (
              <HStack gap={2} color="blue.500">
                <Spinner size="sm" />
                <Text fontSize="sm">更新中...</Text>
              </HStack>
            )}
          </HStack>
          <Button variant='solid' onClick={auth.logout}>ログアウト</Button>
        </HStack>

        <HStack gap={0} alignItems="stretch" h="calc(100vh - 160px)">
          {/* メール一覧 */}
          <Box 
            w="400px" 
            bg={cardBg} 
            borderRadius="md" 
            border="1px" 
            borderColor={borderColor}
            overflow="hidden"
          >
            <Box p={4} borderBottom="1px" borderColor={borderColor}>
              <Text fontWeight="bold">掲示一覧 ({keijiData.length}件)</Text>
            </Box>
            <Box overflowY="auto" h="full">
              {keijiData.length === 0 ? (
                <Center p={8}>
                  <Text color="gray.500">掲示がありません</Text>
                </Center>
              ) : (
                <VStack gap={0}>
                  {keijiData.map((item) => (
                    <Box
                      key={item.id}
                      p={4}
                      cursor="pointer"
                      borderBottom="1px"
                      borderColor={borderColor}
                      bg={selectedItem?.id === item.id ? 'blue.50' : 'transparent'}
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => setSelectedItem(item)}
                    >
                      <VStack alignItems="start" gap={2}>
                        <HStack justify="space-between" w="full">
                          <Badge colorScheme="blue" fontSize="xs">
                            {item.genre_name}
                          </Badge>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(item.created_at)}
                          </Text>
                        </HStack>
                        <Text 
                          fontWeight="semibold" 
                          fontSize="sm" 
                          lineHeight="short"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          display="-webkit-box"
                          css={{
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.title}
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </Box>

          {/* 詳細表示 */}
          <Box 
            flex="1" 
            bg={cardBg} 
            borderRadius="md" 
            border="1px" 
            borderColor={borderColor}
            ml={4}
            overflow="hidden"
          >
            {selectedItem ? (
              <Box h="full">
                <Box p={6} borderBottom="1px" borderColor={borderColor}>
                  <VStack alignItems="start" gap={3}>
                    <HStack>
                      <Badge colorScheme="blue" size="sm">
                        {selectedItem.genre_name}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        {formatDate(selectedItem.created_at)}
                      </Text>
                    </HStack>
                    <Heading size="md">{selectedItem.title}</Heading>
                    <HStack gap={4} fontSize="sm" color="gray.600">
                      <Text>掲示種別: {selectedItem.keijitype}</Text>
                      <Text>ジャンルコード: {selectedItem.genrecd}</Text>
                      <Text>連番: {selectedItem.seqNo}</Text>
                    </HStack>
                  </VStack>
                </Box>
                <Box p={6}>
                  <Text color="gray.600">
                    この掲示の詳細内容を表示する機能は今後実装予定です。
                  </Text>
                </Box>
              </Box>
            ) : (
              <Center h="full">
                <VStack gap={4}>
                  <Text color="gray.500" fontSize="lg">掲示を選択してください</Text>
                  <Text color="gray.400" fontSize="sm" textAlign="center">
                    左の一覧から掲示を選択すると<br />詳細が表示されます
                  </Text>
                </VStack>
              </Center>
            )}
          </Box>
        </HStack>
      </Container>
    </Box>
  )
}