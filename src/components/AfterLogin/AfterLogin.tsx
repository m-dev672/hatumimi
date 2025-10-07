import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Box, Button, Center, createListCollection, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Field } from '@/components/ui/field'
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/components/ui/select'
import { useColorModeValue } from '@/components/ui/color-mode'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { useAuth } from '@/hook/useAuth'
import type { KeijiData, KeijiGenre } from './sqlDatabase'
import { getKeijiGenres, getKeijiDataPaged, getKeijiDataCount } from './sqlDatabase'
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBgColor = useColorModeValue('white', 'gray.800')
  const headerBgColor = useColorModeValue('gray.100', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700')
  const textColor = useColorModeValue('gray.500', 'gray.400')

  const filters = useMemo<Filters | undefined>(() => {
    return searchTitle || selectedGenre 
      ? { ...(searchTitle && { title: searchTitle }), ...(selectedGenre && { genre: selectedGenre }) }
      : undefined
  }, [searchTitle, selectedGenre])

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const loadFilteredData = useCallback(async (filters?: Filters, reset = true) => {
    try {
      if (reset) {
        // 初回読み込みまたはフィルター変更時
        const [result, count] = await Promise.all([
          getKeijiDataPaged(filters, 0, PAGE_SIZE),
          getKeijiDataCount(filters)
        ])
        setData(result)
        setTotalCount(count)
        setHasMore(result.length === PAGE_SIZE && result.length < count)
      } else {
        // 追加読み込み時
        setLoadingMore(true)
        const offset = data.length
        const result = await getKeijiDataPaged(filters, offset, PAGE_SIZE)
        
        setData(prev => [...prev, ...result])
        setHasMore(result.length === PAGE_SIZE && (data.length + result.length) < totalCount)
        setLoadingMore(false)
      }
    } catch (error) {
      console.warn('データの取得に失敗しました:', error)
      if (!reset) setLoadingMore(false)
    }
  }, [data.length, totalCount])

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
        await loadFilteredData(filtersRef.current, true)
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

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !updating) {
      loadFilteredData(filtersRef.current, false)
    }
  }, [loadingMore, hasMore, updating, loadFilteredData])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const threshold = 100 // ピクセル
    
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + threshold) {
      handleLoadMore()
    }
  }, [handleLoadMore])


  useEffect(() => {
    if (!auth.user.id) return
    
    const abortController = new AbortController()
    let sessionActivated = false

    const initializeData = async () => {
      try {
        const genreData = await getKeijiGenres()
        if (abortController.signal.aborted) return
        
        setGenres(genreData)
        
        // 初期データをページング読み込み
        const [result, count] = await Promise.all([
          getKeijiDataPaged(undefined, 0, PAGE_SIZE),
          getKeijiDataCount(undefined)
        ])
        
        if (abortController.signal.aborted) return
        
        setData(result)
        setTotalCount(count)
        setHasMore(result.length === PAGE_SIZE && result.length < count)
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
                // 更新後に再度データを取得
                const [updatedResult, updatedCount] = await Promise.all([
                  getKeijiDataPaged(filtersRef.current, 0, PAGE_SIZE),
                  getKeijiDataCount(filtersRef.current)
                ])
                setData(updatedResult)
                setTotalCount(updatedCount)
                setHasMore(updatedResult.length === PAGE_SIZE && updatedResult.length < updatedCount)
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
  }, [auth.user])

  useEffect(() => {
    if (loading) return
    
    const loadData = async () => {
      try {
        const [result, count] = await Promise.all([
          getKeijiDataPaged(filters, 0, PAGE_SIZE),
          getKeijiDataCount(filters)
        ])
        setData(result)
        setTotalCount(count)
        setHasMore(result.length === PAGE_SIZE && result.length < count)
      } catch (error) {
        console.warn('データの取得に失敗しました:', error)
      }
    }
    
    loadData()
  }, [filters, loading])

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
    <Box bg={bgColor} minH="100vh" p={4}>
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

        <Box bg={cardBgColor} borderRadius="lg" border="1px" borderColor={borderColor} overflow="hidden" 
             w="full" flex="1" display="flex" flexDirection="column" minH="0">
          <Box p={4} borderBottom="1px" borderColor={borderColor} bg={headerBgColor}>
            <VStack gap={3} alignItems="stretch">
              <Text fontWeight="bold">掲示一覧 ({totalCount}件)</Text>
              <Box display="flex" flexDirection={{ base: "column", md: "row" }} gap={3} alignItems="stretch">
                <Field flex={{ base: "none", md: "1" }}>
                  <Input
                    placeholder="タイトルで検索..."
                    value={searchTitle}
                    onChange={handleTitleChange}
                    size="sm"
                    bg={cardBgColor}
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
                  <SelectTrigger bg={cardBgColor}>
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
          
          <Box overflowY="auto" flex="1" onScroll={handleScroll}>
            {data.length === 0 ? (
              <Center p={8}>
                <Text color={textColor}>
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
                    borderColor={borderColor} 
                    _hover={updating ? {} : { bg: hoverBgColor }} 
                    w="full"
                    cursor={updating ? "not-allowed" : "pointer"}
                    opacity={updating ? 0.6 : 1}
                    onClick={() => handleKeijiClick(item)}
                  >
                    <VStack alignItems="start" gap={2}>
                      <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
                        <Badge colorScheme="blue" fontSize="xs">{item.genre_name}</Badge>
                        <Text fontSize="xs" color={textColor} textAlign="right" display={{ base: "none", md: "block" }}>
                          {formatDate(item.published_at)}
                        </Text>
                      </HStack>
                      <Text fontWeight="semibold" fontSize="sm" lineHeight="short">{item.title}</Text>
                      <Text fontSize="xs" color={textColor} textAlign="right" w="full" display={{ base: "block", md: "none" }}>
                        {formatDate(item.published_at)}
                      </Text>
                    </VStack>
                  </Box>
                ))}
                {loadingMore && (
                  <Center p={4}>
                    <HStack>
                      <Spinner size="sm" />
                      <Text fontSize="sm" color={textColor}>読み込み中...</Text>
                    </HStack>
                  </Center>
                )}
                {!hasMore && data.length > 0 && (
                  <Center p={4}>
                    <Text fontSize="sm" color={textColor}>全ての掲示を表示しました</Text>
                  </Center>
                )}
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
