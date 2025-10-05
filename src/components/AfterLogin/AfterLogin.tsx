import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Box, Button, Center, Spinner, Text, VStack, HStack, Badge, Container, Heading, Input, createListCollection } from '@chakra-ui/react'
import { SelectRoot, SelectTrigger, SelectContent, SelectItem, SelectValueText } from '@/components/ui/select'
import { Field } from '@/components/ui/field'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { updateKeijiData } from './updateKeijiData'
import { getKeijiData, getKeijiGenres, type KeijiData, type KeijiGenre } from './sqlDatabase'

export function AfterLogin() {
  const auth = useAuth()
  const [keijiData, setKeijiData] = useState<KeijiData[]>([])
  const [genres, setGenres] = useState<KeijiGenre[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string>()
  const [searchTitle, setSearchTitle] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')

  useEffect(() => {
    if (!auth.user.id) return
    let sessionActivated = false

    const loadData = async () => {
      try {
        const [data, genres] = await Promise.all([getKeijiData(), getKeijiGenres()])
        setKeijiData(data)
        setGenres(genres)
        setLoading(false)

        sessionActivated = await activateSession(auth.user)
        if (sessionActivated) {
          setUpdating(true)
          try {
            await updateKeijiData()
            setKeijiData(await getKeijiData())
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
    return () => { if (sessionActivated) deactivateSession() }
  }, [auth.user])

  const filteredData = useMemo(() => 
    keijiData.filter(item => 
      (!searchTitle || item.title.toLowerCase().includes(searchTitle.toLowerCase())) &&
      (!selectedGenre || item.genre_name === selectedGenre)
    ), [keijiData, searchTitle, selectedGenre])

  const formatDate = (dateStr: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : ''

  if (loading) return (
    <Center h="100vh" flexDirection="column" mx={4}>
      <VStack>
        <Spinner size="xl" />
        <Text mt={4}>掲示板を取得中</Text>
      </VStack>
      <Button mt={4} onClick={auth.logout}>ログアウト</Button>
    </Center>
  )

  if (error) return (
    <Center h="100vh" flexDirection="column" mx={4}>
      <Text color="red.500" mb={4} textAlign="center">{error}</Text>
      <Button onClick={auth.logout}>ログアウト</Button>
    </Center>
  )

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
          <Button onClick={auth.logout}>ログアウト</Button>
        </HStack>

        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden" 
             h="calc(100vh - 200px)" display="flex" flexDirection="column">
          <Box p={4} borderBottom="1px" borderColor="gray.200" bg="gray.100">
            <VStack gap={3} alignItems="stretch">
              <Text fontWeight="bold">掲示一覧 ({filteredData.length}件)</Text>
              <HStack gap={3}>
                <Field flex="1">
                  <Input
                    placeholder="タイトルで検索..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    size="sm"
                    bg="white"
                  />
                </Field>
                <SelectRoot 
                  collection={createListCollection({ items: genres.map(g => ({ label: g.genre_name, value: g.genre_name })) })}
                  value={selectedGenre ? [selectedGenre] : []}
                  onValueChange={(details) => setSelectedGenre(details.value[0] || '')}
                  size="sm"
                  width="200px"
                >
                  <SelectTrigger bg="white">
                    <SelectValueText placeholder="全てのカテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={`${genre.keijitype}-${genre.genrecd}`} item={{ label: genre.genre_name, value: genre.genre_name }}>
                        {genre.genre_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </HStack>
            </VStack>
          </Box>
          <Box overflowY="auto" flex="1">
            {filteredData.length === 0 ? (
              <Center p={8}>
                <Text color="gray.500">
                  {keijiData.length === 0 ? '掲示がありません' : '検索条件に一致する掲示がありません'}
                </Text>
              </Center>
            ) : (
              <VStack gap={0} w="full">
                {filteredData.map((item) => (
                  <Box key={item.id} p={4} borderBottom="1px" borderColor="gray.200" 
                       _hover={{ bg: 'gray.50' }} w="full">
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