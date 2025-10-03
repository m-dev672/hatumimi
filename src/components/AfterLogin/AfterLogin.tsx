import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Button, Center, Spinner, Text, VStack, Popover, Portal, Link } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { getCompletedCourses, type Course } from './getCompletedCourses'
import { getCurrentCourses } from './getCurrentCourses'
import { countUnits } from './countUnits'

export function AfterLogin() {
  const auth = useAuth()

  const [units, setUnits] = useState<Record<string, string[]>>()
  const [otherCourses, setOtherCourses] = useState<{completed: Course[], current: Course[]}>()
  const [categoryCourses, setCategoryCourses] = useState<Record<string, {completed: Course[], current: Course[]}>>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.user.id) return

    let sessionActivated = false

    ;(async () => {
      sessionActivated = await activateSession(auth.user)
      if (sessionActivated) {
        const result = await countUnits(await getCompletedCourses(), await getCurrentCourses())
        setUnits(result.units)
        setCategoryCourses(result.categoryCourses)
        setOtherCourses(result.otherCourses)
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
      {units && Object.entries(units).map(([key, value]) => {
        const isOther = key === 'その他'
        const categoryData = categoryCourses?.[key]
        const courses = isOther ? otherCourses : categoryData
        const hasCourses = courses && (courses.completed.length > 0 || courses.current.length > 0)
        
        const renderCourseSection = (title: string, courseList: Course[]) => 
          courseList.length > 0 && (
            <div style={{ marginTop: title === '履修中' && courses?.completed.length ? '8px' : '0' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}:</div>
              {courseList.map((course, index) => (
                <div key={`${title}-${index}`} style={{ marginLeft: '8px' }}>
                  {course.courseName}{course.units ? `（${course.units}単位）` : '（不明）'}
                </div>
              ))}
            </div>
          )

        const popoverContent = hasCourses ? (
          <div>
            {renderCourseSection('取得済み', courses.completed)}
            {renderCourseSection('履修中', courses.current)}
          </div>
        ) : '科目がありません'

        return (
          <Popover.Root key={key} positioning={{ placement: "bottom", flip: false }}>
            <Popover.Trigger asChild>
              <Link cursor="pointer">
                <Text style={{ cursor: 'pointer' }}>
                  <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                    {key}
                  </span>
                  : {value[0]}
                  <span style={{ color: '#999', fontSize: '0.8em' }}>{value[1]}</span>
                  {!isOther && `${value[2]}${value[3]}`}
                </Text>
              </Link>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Body>{popoverContent}</Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        )
      })}
      <p style={{ color: '#666', fontSize: '0.9em', marginTop: '1rem' }}>※単位数が不明な科目については1単位で換算しています。</p>
      <p style={{ color: '#666', fontSize: '0.9em' }}>※教職・社会教育士課程の方は資格取得のための単位がどの分野に算入されるかを改めてご確認ください。</p>
      <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
    </Center>
  )
}