import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth';
import { Button, Center } from '@chakra-ui/react';
import { activateSession, deactivateSession } from '@/context/Auth/authCookie';
import { getCompletedCourses } from './getCompletedCourses';
import { getCurrentCourses } from './getCurrentCourses';
import { countUnits} from './countUnits';

export function AfterLogin() {
  const auth = useAuth()

  const [units, setUnits] = useState<Record<string, string[]>>();

  useEffect(() => {
    if (!auth.user.id) return;

    let sessionActivated = false;

    (async () => {
      await deactivateSession();
      sessionActivated = await activateSession(auth.user);
      
      if (sessionActivated) {
        setUnits(await countUnits(await getCompletedCourses(), await getCurrentCourses()))
        await deactivateSession();
      }
    })();
  }, [auth.user])

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
        {units && Object.entries(units).map(([key, value]) => {
          if (value.length > 2) {
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
        })}
        <p style={{ color: '#666', fontSize: '0.9em', marginTop: '1rem'}}>※単位数が不明な科目については1単位で換算しています。</p>
        <p style={{ color: '#666', fontSize: '0.9em'}}>※教職・社会教育士課程の方は資格取得のための単位がどの分野に算入されるかを改めてご確認ください。</p>
      <Button variant='solid' mt={4} onClick={() => {
        auth.logout()
      }}>ログアウト</Button>
    </Center>
  )
}