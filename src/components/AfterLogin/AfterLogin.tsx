import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Button, Center, Spinner, Text, VStack, Popover, Portal, Link } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { getCompletedCourses, type Course } from './getCompletedCourses'
import { getCurrentCourses } from './getCurrentCourses'
import { countUnits, type CategoryData } from './countUnits'
import { getCurriculumPath } from './getCurriculumPath'

export function AfterLogin() {
  const auth = useAuth()

  const [data, setData] = useState<CategoryData[]>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.user.id) return

    let sessionActivated = false

    ;(async () => {
      sessionActivated = await activateSession(auth.user)
      if (sessionActivated) {
        const [completedCourses, { curriculumPath, currentCourses }] = await Promise.all([
          getCompletedCourses(),
          (async () => {
            const curriculumPath = await getCurriculumPath()
            const currentCourses = await getCurrentCourses(curriculumPath)
            return { curriculumPath, currentCourses }
          })()
        ])
        setData(await countUnits(completedCourses, currentCourses, curriculumPath))
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
          <Text mt={4}>単位数を計算中</Text>
        </VStack>
        <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
      </Center>
    )
  }

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
      {data && data.map((categoryData) => {
        const hasCourses = categoryData.courses.completed.length > 0 || categoryData.courses.current.length > 0
        
        const renderSection = (title: string, list: Course[]) => list.length > 0 && (
          <div style={{ marginTop: title === '履修中' && categoryData.courses.completed.length ? '8px' : '0' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}:</div>
            {list.map((course, i) => (
              <div key={i} style={{ marginLeft: '8px' }}>
                {course.courseName}{course.units ? `（${course.units}単位）` : '（不明）'}
              </div>
            ))}
          </div>
        )

        const formatDisplayText = () => {
          if (categoryData.category === 'その他') {
            return `${categoryData.category}: ${categoryData.currentUnits}(${categoryData.futureUnits})`
          } else {
            return `${categoryData.category}: ${categoryData.currentUnits}(${categoryData.futureUnits}) / ${categoryData.requiredUnits}`
          }
        }

        return (
          <Popover.Root key={categoryData.category} positioning={{ placement: "bottom", flip: false }}>
            <Popover.Trigger asChild>
              <Link cursor="pointer">
                <Text style={{ cursor: 'pointer', color: categoryData.completed ? '#98D8C8' : 'inherit' }}>
                  <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{categoryData.category}</span>
                  : {categoryData.currentUnits}
                  <span style={{ color: '#999', fontSize: '0.8em' }}>({categoryData.futureUnits})</span>
                  {categoryData.category !== 'その他' && ` / ${categoryData.requiredUnits}`}
                </Text>
              </Link>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Body>
                    {hasCourses ? (
                      <div>
                        {renderSection('取得済み', categoryData.courses.completed)}
                        {renderSection('履修中', categoryData.courses.current)}
                      </div>
                    ) : '科目がありません'}
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        )
      })}
      {['※単位数が不明な科目については1単位で換算しています。', '※教職・社会教育士課程の方は資格取得のための単位がどの分野に算入されるかを改めてご確認ください。'].map((text, i) => (
        <p key={i} style={{ color: '#666', fontSize: '0.9em', marginTop: i === 0 ? '1rem' : '0' }}>{text}</p>
      ))}
      <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
    </Center>
  )
}