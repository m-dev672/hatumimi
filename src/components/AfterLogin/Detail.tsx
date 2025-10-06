import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Badge, Box, Button, Heading, HStack, Table, Text, VStack,
} from '@chakra-ui/react'
import { formatDate } from './utils'
import type { KeijiData } from './sqlDatabase'
import { fetchKeijiDetail, type KeijiAttachment, type KeijiTable } from './keijiDataExtractor'
import { activateSession } from '@/context/Auth/authCookie'
import { useAuth } from '@/hook/useAuth'

interface DetailProps {
  keiji: KeijiData | null
  isOpen: boolean
  onClose: () => void
}

export function Detail({ keiji, isOpen, onClose }: DetailProps) {
  const auth = useAuth()
  const [detailContent, setDetailContent] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<KeijiAttachment[]>([])
  const [tables, setTables] = useState<KeijiTable[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)

  const fetchDetail = useCallback(async () => {
    if (!auth.user.id || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)
    try {
      // Detail専用のセッション管理（分離）
      const activated = await activateSession(auth.user)
      if (activated) {
        const result = await fetchKeijiDetail(keiji?.keijitype || 0, keiji?.genrecd || 0, keiji?.seqNo || '')
        setDetailContent(result.content)
        setAttachments(result.attachments)
        setTables(result.tables)
      } else {
        console.error('セッションの有効化に失敗しました')
      }
    } catch (error) {
      console.error('詳細情報の取得に失敗しました:', error)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [auth.user, keiji?.keijitype, keiji?.genrecd, keiji?.seqNo])

  const handleAttachmentClick = useCallback(async (attachment: KeijiAttachment) => {
    try {
      const response = await fetch(`/campusweb/${attachment.downloadUrl}`)
      if (!response.ok) {
        throw new Error(`ダウンロードに失敗しました: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('ファイルのダウンロードに失敗しました:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen && keiji) {
      // 掲示が変わった時はコンテンツをリセット
      setDetailContent(null)
      setAttachments([])
      setTables([])
      fetchDetail()
    }
  }, [isOpen, keiji, fetchDetail])

  // モーダルが閉じられた時にコンテンツをクリア
  useEffect(() => {
    if (!isOpen) {
      setDetailContent(null)
      setAttachments([])
      setTables([])
    }
  }, [isOpen])

  if (!isOpen || !keiji) return null


  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      w="100vw"
      h="100vh"
      bg="rgba(0, 0, 0, 0.5)"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        w="full"
        maxW="4xl"
        maxH="90vh"
        overflow="hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Box bg="gray.50" p={4}>
          <HStack w="full" gap={3}>
            <Button onClick={onClose} variant="outline" size="sm">
              ← 戻る
            </Button>
            <Heading size="lg">掲示詳細</Heading>
          </HStack>
        </Box>

        <Box
          p={6}
          overflowY="auto"
          maxH="calc(90vh - 80px)"
        >
          <VStack alignItems="start" gap={6} w="full">
            {/* ヘッダー情報 */}
            <VStack alignItems="start" gap={3} w="full">
              <HStack justify="space-between" w="full">
                <Badge colorScheme="red" fontSize="sm" px={3} py={1}>
                  {keiji.genre_name}
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  {formatDate(keiji.published_at)}
                </Text>
              </HStack>
              <Heading size="lg" lineHeight="tall">
                {keiji.title}
              </Heading>
            </VStack>

            {/* 本文 */}
            <Box w="full">
              <Text
                fontSize="md"
                lineHeight="tall"
                whiteSpace="pre-wrap"
                color="gray.700"
              >
                {isLoading ? '詳細情報を取得中...' : (detailContent || '詳細情報を取得できませんでした。')}
              </Text>
            </Box>

            {/* 添付ファイル */}
            {attachments.length > 0 && (
              <VStack alignItems="start" gap={4} w="full">
                <Heading size="md" color="gray.700">
                  📎 添付ファイル
                </Heading>
                <VStack gap={3} w="full" alignItems="start">
                  {attachments.map((attachment, index) => (
                    <Box
                      key={index}
                      p={4}
                      border="1px"
                      borderColor="gray.300"
                      borderRadius="lg"
                      bg="blue.25"
                      w="full"
                      cursor="pointer"
                      _hover={{ 
                        bg: 'blue.50', 
                        borderColor: 'blue.300',
                        transform: 'translateY(-1px)',
                        boxShadow: 'md'
                      }}
                      transition="all 0.2s"
                      boxShadow="sm"
                      onClick={() => handleAttachmentClick(attachment)}
                    >
                      <HStack justify="space-between" w="full">
                        <HStack gap={3}>
                          <Box
                            bg="blue.100"
                            borderRadius="md"
                            p={2}
                          >
                            <Text fontSize="lg">📄</Text>
                          </Box>
                          <VStack alignItems="start" gap={1}>
                            <Text fontSize="sm" fontWeight="medium" color="gray.700">
                              {attachment.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              クリックしてダウンロード
                            </Text>
                          </VStack>
                        </HStack>
                        <Text fontSize="sm" color="blue.600" fontWeight="medium">
                          ⬇️
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* 追加情報テーブル */}
            {tables.length > 0 && (
              <VStack alignItems="start" gap={6} w="full">
                <Heading size="md" color="gray.700">
                  📋 追加情報
                </Heading>
                {tables.map((table, tableIndex) => (
                  <Box 
                    key={tableIndex} 
                    w="full" 
                    border="1px" 
                    borderColor="gray.300" 
                    borderRadius="lg" 
                    overflow="hidden"
                    boxShadow="sm"
                    bg="white"
                  >
                    {table.title && (
                      <Box bg="blue.50" px={4} py={3} borderBottom="1px" borderColor="gray.200">
                        <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                          {table.title}
                        </Text>
                      </Box>
                    )}
                    <Table.Root size="sm" variant="line">
                      <Table.Body>
                        {table.rows.map((row, rowIndex) => (
                          <Table.Row 
                            key={rowIndex} 
                            bg={rowIndex % 2 === 0 ? 'gray.25' : 'white'}
                            _hover={{ bg: 'blue.25' }}
                            transition="background-color 0.2s"
                          >
                            {row.cells.map((cell, cellIndex) => (
                              <Table.Cell 
                                key={cellIndex} 
                                fontSize="sm" 
                                py={3}
                                px={4}
                                borderColor="gray.200"
                                color={cellIndex === 0 ? 'gray.700' : 'gray.600'}
                                fontWeight={cellIndex === 0 ? 'medium' : 'normal'}
                                maxW="300px"
                              >
                                <Text
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  whiteSpace="nowrap"
                                  title={cell}
                                >
                                  {cell}
                                </Text>
                              </Table.Cell>
                            ))}
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}