import { useCallback } from 'react'
import {
  Badge, Box, Button, Heading, HStack, Text, VStack,
} from '@chakra-ui/react'
import { formatDate } from './utils'

interface DetailProps {
  keijiId?: string
  onBack: () => void
}

export function Detail({ keijiId, onBack }: DetailProps) {

  // 仮置きデータ
  const mockData = {
    id: keijiId || '1',
    title: '【重要】システムメンテナンスのお知らせ',
    genre_name: '重要',
    published_at: '2024-01-15T10:00:00Z',
    content: `システムメンテナンスを下記の通り実施いたします。

【メンテナンス日時】
2024年1月20日（土） 2:00 ～ 6:00（予定）

【メンテナンス内容】
・システムの安定性向上のためのアップデート
・セキュリティパッチの適用
・データベースの最適化

【影響範囲】
メンテナンス時間中は、以下のサービスがご利用いただけません。
・学務システム全般
・履修登録機能
・成績照会機能

ご迷惑をおかけいたしますが、ご理解とご協力をお願いいたします。

【お問い合わせ】
システムに関するお問い合わせは、学務課までご連絡ください。
TEL: 03-1234-5678
Email: gakumu@university.ac.jp`,
    attachments: [
      { name: 'メンテナンス詳細.pdf', size: '256KB' },
      { name: '影響範囲一覧.xlsx', size: '128KB' }
    ]
  }


  const handleAttachmentClick = useCallback((attachment: { name: string; size: string }) => {
    // 添付ファイルダウンロード処理（仮置き）
    console.log('Downloading attachment:', attachment.name)
    alert(`添付ファイル「${attachment.name}」のダウンロードを開始します。`)
  }, [])

  return (
    <Box bg="gray.50" minH="100vh" p={4}>
      <VStack h="100%" maxH="calc(100vh - 2rem)" gap={4}>
        <HStack w="full" flex="0 0 auto" gap={3}>
          <Button onClick={onBack} variant="outline" size="sm">
            ← 戻る
          </Button>
          <Heading size="lg">掲示詳細</Heading>
        </HStack>

        <Box 
          bg="white" 
          borderRadius="lg" 
          border="1px" 
          borderColor="gray.200" 
          w="full" 
          flex="1" 
          p={6}
          overflowY="auto"
        >
          <VStack alignItems="start" gap={6} w="full">
            {/* ヘッダー情報 */}
            <VStack alignItems="start" gap={3} w="full">
              <HStack justify="space-between" w="full">
                <Badge colorScheme="red" fontSize="sm" px={3} py={1}>
                  {mockData.genre_name}
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  {formatDate(mockData.published_at)}
                </Text>
              </HStack>
              <Heading size="lg" lineHeight="tall">
                {mockData.title}
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
                {mockData.content}
              </Text>
            </Box>

            {/* 添付ファイル */}
            {mockData.attachments.length > 0 && (
              <VStack alignItems="start" gap={3} w="full">
                <Heading size="md" color="gray.700">
                  添付ファイル
                </Heading>
                <VStack gap={2} w="full" alignItems="start">
                  {mockData.attachments.map((attachment, index) => (
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
                        <Text fontSize="xs" color="gray.500">
                          {attachment.size}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}