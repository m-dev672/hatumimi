import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Box, Button, Center, createListCollection, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Field } from '@/components/ui/field'
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/components/ui/select'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { useAuth } from '@/hook/useAuth'
import type { KeijiData, KeijiGenre } from './sqlDatabase'
import { getKeijiData, getKeijiGenres } from './sqlDatabase'
import { shouldSkipAutoUpdate, recordLastUpdate } from './indexedDatabase'
import { updateKeijiData } from './updateKeijiData'
import { Detail } from './Detail'
import { formatDate } from './utils'

interface Filters {
  title?: string
  genre?: string
}

export function AfterLogin() {
  const auth = useAuth()
  const [data, setData] = useState<KeijiData[]>([])
  const [genres, setGenres] = useState<KeijiGenre[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string>()
  const [searchTitle, setSearchTitle] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedKeiji, setSelectedKeiji] = useState<KeijiData | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filters = useMemo<Filters | undefined>(() => {
    return searchTitle || selectedGenre 
      ? { ...(searchTitle && { title: searchTitle }), ...(selectedGenre && { genre: selectedGenre }) }
      : undefined
  }, [searchTitle, selectedGenre])

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const loadFilteredData = useCallback(async (filters?: Filters) => {
    try {
      const result = await getKeijiData(filters)
      setData(result)
    } catch (error) {
      console.warn('データの取得に失敗しました:', error)
    }
  }, [])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTitle(e.target.value)
  }, [])

  const handleGenreChange = useCallback((details: { value: string[] }) => {
    setSelectedGenre(details.value[0] || '')
  }, [])

  const handleKeijiClick = useCallback((item: KeijiData) => {
    if (updating) return // 更新中はクリック無効
    setSelectedKeiji(item)
    setIsDetailOpen(true)
  }, [updating])

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false)
    setSelectedKeiji(null)
  }, [])

  const handleManualRefresh = useCallback(async () => {
    if (!auth.user.id || updating) return
    
    setUpdating(true)
    try {
      const activated = await activateSession(auth.user)
      if (activated) {
        await updateKeijiData()
        await loadFilteredData(filtersRef.current)
        // 手動更新完了後に最終更新時刻を記録
        await recordLastUpdate()
        await deactivateSession()
      }
    } catch (error) {
      console.warn('手動更新に失敗しました:', error)
    } finally {
      setUpdating(false)
    }
  }, [auth.user, updating, loadFilteredData])


  useEffect(() => {
    if (!auth.user.id) return
    
    const abortController = new AbortController()
    let sessionActivated = false

    const initializeData = async () => {
      try {
        const [initialData, genreData] = await Promise.all([getKeijiData(), getKeijiGenres()])
        if (abortController.signal.aborted) return
        
        setData(initialData)
        setGenres(genreData)
        setLoading(false)

        // 1時間以内の更新をスキップするかチェック
        const skipUpdate = await shouldSkipAutoUpdate()
        
        if (!skipUpdate) {
          sessionActivated = await activateSession(auth.user)
          if (sessionActivated && !abortController.signal.aborted) {
            setUpdating(true)
            try {
              await updateKeijiData()
              if (!abortController.signal.aborted) {
                await loadFilteredData(filtersRef.current)
                // 更新完了後に最終更新時刻を記録
                await recordLastUpdate()
              }
            } catch (error) {
              console.warn('掲示データの更新に失敗しました:', error)
            } finally {
              if (!abortController.signal.aborted) {
                setUpdating(false)
              }
            }
          }
        } else {
          console.log('1時間以内に更新済みのため、自動更新をスキップします')
        }
      } catch {
        if (!abortController.signal.aborted) {
          setError('掲示データの取得に失敗しました')
          setLoading(false)
        }
      }
    }

    initializeData()
    return () => { 
      abortController.abort()
      if (sessionActivated) deactivateSession() 
    }
  }, [auth.user, loadFilteredData])

  useEffect(() => {
    if (loading) return
    loadFilteredData(filters)
  }, [filters, loadFilteredData, loading])

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
    <Box bg="gray.50" minH="100vh" p={4}>
      <VStack h="100%" maxH="calc(100vh - 2rem)" gap={4}>
        <HStack justify="space-between" w="full" flex="0 0 auto">
          <Heading size="lg">HatuMiMi</Heading>
          <HStack>
            <Button 
              onClick={handleManualRefresh} 
              disabled={updating}
              size="sm"
              variant="outline"
              colorScheme={updating ? "blue" : "gray"}
            >
              <HStack gap={2}>
                {updating && <Spinner size="sm" />}
                <Text>{updating ? "更新中..." : "更新"}</Text>
              </HStack>
            </Button>
            <Button onClick={auth.logout}>ログアウト</Button>
          </HStack>
        </HStack>

        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden" 
             w="full" flex="1" display="flex" flexDirection="column" minH="0">
          <Box p={4} borderBottom="1px" borderColor="gray.200" bg="gray.100">
            <VStack gap={3} alignItems="stretch">
              <Text fontWeight="bold">掲示一覧 ({data.length}件)</Text>
              <Box display="flex" flexDirection={{ base: "column", md: "row" }} gap={3} alignItems="stretch">
                <Field flex={{ base: "none", md: "1" }}>
                  <Input
                    placeholder="タイトルで検索..."
                    value={searchTitle}
                    onChange={handleTitleChange}
                    size="sm"
                    bg="white"
                  />
                </Field>
                <SelectRoot 
                  collection={createListCollection({ 
                    items: [
                      { label: "全てのカテゴリ", value: "" },
                      ...genres.map(g => ({ label: g.genre_name, value: g.genre_name }))
                    ]
                  })}
                  value={selectedGenre ? [selectedGenre] : [""]}
                  onValueChange={handleGenreChange}
                  size="sm"
                  width={{ base: "100%", md: "18rem" }}
                >
                  <SelectTrigger bg="white">
                    <SelectValueText placeholder="全てのカテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem item={{ label: "全てのカテゴリ", value: "" }}>
                      全てのカテゴリ
                    </SelectItem>
                    {genres.map((genre) => (
                      <SelectItem key={`${genre.keijitype}-${genre.genrecd}`} 
                                  item={{ label: genre.genre_name, value: genre.genre_name }}>
                        {genre.genre_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>
            </VStack>
          </Box>
          
          <Box overflowY="auto" flex="1">
            {data.length === 0 ? (
              <Center p={8}>
                <Text color="gray.500">
                  {filters ? '検索条件に一致する掲示がありません' : '掲示がありません'}
                </Text>
              </Center>
            ) : (
              <VStack gap={0} w="full">
                {data.map((item) => (
                  <Box 
                    key={item.id} 
                    p={4} 
                    borderBottom="1px" 
                    borderColor="gray.200" 
                    _hover={updating ? {} : { bg: 'gray.50' }} 
                    w="full"
                    cursor={updating ? "not-allowed" : "pointer"}
                    opacity={updating ? 0.6 : 1}
                    onClick={() => handleKeijiClick(item)}
                  >
                    <VStack alignItems="start" gap={2}>
                      <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
                        <Badge colorScheme="blue" fontSize="xs">{item.genre_name}</Badge>
                        <Text fontSize="xs" color="gray.500" textAlign="right" display={{ base: "none", md: "block" }}>
                          {formatDate(item.published_at)}
                        </Text>
                      </HStack>
                      <Text fontWeight="semibold" fontSize="sm" lineHeight="short">{item.title}</Text>
                      <Text fontSize="xs" color="gray.500" textAlign="right" w="full" display={{ base: "block", md: "none" }}>
                        {formatDate(item.published_at)}
                      </Text>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </Box>
      </VStack>

      <Detail
        keiji={selectedKeiji}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </Box>
  )
}
