import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Center, createListCollection, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { Field } from '@/components/ui/field'
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/components/ui/select'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { useAuth } from '@/hook/useAuth'
import type { KeijiData, KeijiGenre } from './sqlDatabase'
import { getKeijiData, getKeijiGenres } from './sqlDatabase'
import { updateKeijiData } from './updateKeijiData'

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

  const filters = useMemo<Filters | undefined>(() => {
    return searchTitle || selectedGenre 
      ? { ...(searchTitle && { title: searchTitle }), ...(selectedGenre && { genre: selectedGenre }) }
      : undefined
  }, [searchTitle, selectedGenre])

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

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }, [])

  useEffect(() => {
    if (!auth.user.id) return
    let sessionActivated = false

    const initializeData = async () => {
      try {
        const [initialData, genreData] = await Promise.all([getKeijiData(), getKeijiGenres()])
        setData(initialData)
        setGenres(genreData)
        setLoading(false)

        sessionActivated = await activateSession(auth.user)
        if (sessionActivated) {
          setUpdating(true)
          try {
            await updateKeijiData()
            await loadFilteredData(filters)
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

    initializeData()
    return () => { if (sessionActivated) deactivateSession() }
  }, [auth.user, loadFilteredData, filters])

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
                    items: genres.map(g => ({ label: g.genre_name, value: g.genre_name })) 
                  })}
                  value={selectedGenre ? [selectedGenre] : []}
                  onValueChange={handleGenreChange}
                  size="sm"
                  width={{ base: "100%", md: "18rem" }}
                >
                  <SelectTrigger bg="white">
                    <SelectValueText placeholder="全てのカテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
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
      </VStack>
    </Box>
  )
}
