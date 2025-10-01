import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth';
import { Button, Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { Tooltip } from '@/components/ui/tooltip';
import { activateSession, deactivateSession } from '@/context/Auth/authCookie';
import { getCompletedCourses } from './getCompletedCourses';
import { getCurrentCourses } from './getCurrentCourses';
import { countUnits } from './countUnits';

export function AfterLogin() {
  const auth = useAuth()

  const [units, setUnits] = useState<Record<string, string[]>>();
  const [otherCourses, setOtherCourses] = useState<any[]>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user.id) return;

    let sessionActivated = false;

    (async () => {
      sessionActivated = await activateSession(auth.user);

      if (sessionActivated) {
        const result = await countUnits(await getCompletedCourses(), await getCurrentCourses());
        const { その他_courses, ...unitsData } = result;
        setUnits(unitsData as Record<string, string[]>);
        setOtherCourses(その他_courses as any[]);
        setLoading(false);
      }
    })();

    return () => {
      if (sessionActivated) {
        deactivateSession();
      }
    };
  }, [auth.user])

  if (loading) {
    return (
      <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
        <VStack>
          <Spinner size="xl" />
          <Text mt={4}>単位数を計算中</Text>
        </VStack>
        <Button variant='solid' mt={4} onClick={() => {
          auth.logout()
        }}>ログアウト</Button>
      </Center>
    )
  }

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
      {units && Object.entries(units).map(([key, value]) => {
        if (Array.isArray(value) && value.length > 2) {
          if (key === 'その他') {
            const tooltipContent = otherCourses && otherCourses.length > 0 
              ? (
                  <div>
                    {otherCourses.map((course, index) => (
                      <div key={index}>{course.courseName}（{course.units}単位）</div>
                    ))}
                  </div>
                )
              : '科目がありません';
            
            return (
              <Tooltip key={key} content={tooltipContent}>
                <p style={{ 
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted'
                }}>
                  {key}: {value[0]}
                  <span style={{ color: '#999', fontSize: '0.8em' }}>
                    {value[1]}
                  </span>
                </p>
              </Tooltip>
            )
          } else {
            return (
              <p key={key}>
                {key}: {value[0]}
                <span style={{ color: '#999', fontSize: '0.8em' }}>
                  {value[1]}
                </span>
                {value[2]}
                {value[3]}
              </p>
            )
          }
        } else if (Array.isArray(value)) {
          if (key === 'その他') {
            const tooltipContent = otherCourses && otherCourses.length > 0 
              ? (
                  <div>
                    {otherCourses.map((course, index) => (
                      <div key={index}>{course.courseName}（{course.units}単位）</div>
                    ))}
                  </div>
                )
              : '科目がありません';
            
            return (
              <Tooltip key={key} content={tooltipContent}>
                <p style={{ 
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted'
                }}>
                  {key}: {value[0]}
                  <span style={{ color: '#999', fontSize: '0.8em' }}>
                    {value[1]}
                  </span>
                </p>
              </Tooltip>
            )
          } else {
            return (
              <p key={key}>
                {key}: {value[0]}
                <span style={{ color: '#999', fontSize: '0.8em' }}>
                  {value[1]}
                </span>
              </p>
            )
          }
        }
        return null;
      })}
      <p style={{ color: '#666', fontSize: '0.9em', marginTop: '1rem' }}>※単位数が不明な科目については1単位で換算しています。</p>
      <p style={{ color: '#666', fontSize: '0.9em' }}>※教職・社会教育士課程の方は資格取得のための単位がどの分野に算入されるかを改めてご確認ください。</p>
      <Button variant='solid' mt={4} onClick={() => {
        auth.logout()
      }}>ログアウト</Button>
    </Center>
  )
}