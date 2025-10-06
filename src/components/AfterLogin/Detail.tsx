import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Badge, Box, Button, Heading, HStack, Text, VStack,
} from '@chakra-ui/react'
import { formatDate } from './utils'
import type { KeijiData } from './sqlDatabase'
import { fetchKeijiDetail, type KeijiAttachment } from './keijiDataExtractor'
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
      fetchDetail()
    }
  }, [isOpen, keiji, fetchDetail])

  // モーダルが閉じられた時にコンテンツをクリア
  useEffect(() => {
    if (!isOpen) {
      setDetailContent(null)
      setAttachments([])
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
              <VStack alignItems="start" gap={3} w="full">
                <Heading size="md" color="gray.700">
                  添付ファイル
                </Heading>
                <VStack gap={2} w="full" alignItems="start">
                  {attachments.map((attachment, index) => (
                    <Box
                      key={index}
                      p={3}
                      border="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg="gray.50"
                      w="full"
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                      onClick={() => handleAttachmentClick(attachment)}
                    >
                      <HStack justify="space-between">
                        <HStack>
                          <Text fontSize="sm" fontWeight="medium">
                            📎 {attachment.name}
                          </Text>
                        </HStack>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}