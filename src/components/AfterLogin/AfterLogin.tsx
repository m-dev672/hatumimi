import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Button, Center, Spinner, Text, VStack, Popover, Portal, Link } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { getCompletedCourses, type Course } from './getCompletedCourses'
import { getCurrentCourses } from './getCurrentCourses'
import { countUnits } from './countUnits'
import { getCurriculumPath } from './getCurriculumPath'

export function AfterLogin() {
  const auth = useAuth()

  const [data, setData] = useState<{units: Record<string, string[]>, categoryCourses: Record<string, {completed: Course[], current: Course[]}>}>()
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
      {data?.units && Object.entries(data.units).map(([key, value]) => {
        const courses = data.categoryCourses[key]
        const hasCourses = courses && (courses.completed.length > 0 || courses.current.length > 0)
        
        const renderSection = (title: string, list: Course[]) => list.length > 0 && (
          <div style={{ marginTop: title === '履修中' && courses.completed.length ? '8px' : '0' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}:</div>
            {list.map((course, i) => (
              <div key={i} style={{ marginLeft: '8px' }}>
                {course.courseName}{course.units ? `（${course.units}単位）` : '（不明）'}
              </div>
            ))}
          </div>
        )

        return (
          <Popover.Root key={key} positioning={{ placement: "bottom", flip: false }}>
            <Popover.Trigger asChild>
              <Link cursor="pointer">
                <Text style={{ cursor: 'pointer' }}>
                  <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{key}</span>
                  : {value[0]}
                  <span style={{ color: '#999', fontSize: '0.8em' }}>{value[1]}</span>
                  {key !== 'その他' && `${value[2]}${value[3]}`}
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
                        {renderSection('取得済み', courses.completed)}
                        {renderSection('履修中', courses.current)}
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