import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { Button, Center, Spinner, Text, VStack, Popover, Portal, Link } from '@chakra-ui/react'
import { activateSession, deactivateSession } from '@/context/Auth/authCookie'
import { getCompletedCourses, type Course } from './getCompletedCourses'
import { getCurrentCourses } from './getCurrentCourses'
import { countUnits, type CategoryData } from './countUnits'
import { getCurriculumPath } from './getCurriculumPath'

const CourseSection = ({ title, courses }: { title: string; courses: Course[] }) => 
  courses.length > 0 && (
    <div style={{ marginTop: title === '履修中' ? '8px' : '0' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}:</div>
      {courses.map((course, i) => (
        <div key={i} style={{ marginLeft: '8px' }}>
          {course.courseName}{course.units ? `（${course.units}単位）` : '（不明）'}
        </div>
      ))}
    </div>
  )

const CategoryDisplay = ({ data }: { data: CategoryData }) => (
  <Popover.Root key={data.category} positioning={{ placement: "bottom", flip: false }}>
    <Popover.Trigger asChild>
      <Link cursor="pointer">
        <Text style={{ cursor: 'pointer', color: data.completed ? '#5FB89B' : 'inherit' }}>
            {data.category}
            : {data.currentUnits}
            <span style={{ color: 'color-mix(in srgb, currentColor 70%, transparent)', fontSize: '0.8em' }}>({data.futureUnits})</span>
            {data.category !== 'その他' && ` / ${data.requiredUnits}`}
          </Text>
        </Link>
      </Popover.Trigger>
    <Portal>
      <Popover.Positioner>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Body>
            {data.courses.completed.length > 0 || data.courses.current.length > 0 ? (
              <div>
                <CourseSection title="取得済み" courses={data.courses.completed} />
                <CourseSection title="履修中" courses={data.courses.current} />
              </div>
            ) : '科目がありません'}
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  </Popover.Root>
)

const notes = [
  '※単位数が不明な科目については1単位で換算しています。',
  '※教職・社会教育士課程の方は資格取得のための単位がどの分野に算入されるかを改めてご確認ください。'
]

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
      {data?.map(categoryData => <CategoryDisplay key={categoryData.category} data={categoryData} />)}
      {notes.map((text, i) => (
        <p key={i} style={{ color: '#666', fontSize: '0.9em', marginTop: i === 0 ? '1rem' : '0' }}>{text}</p>
      ))}
      <Button variant='solid' mt={4} onClick={auth.logout}>ログアウト</Button>
    </Center>
  )
}