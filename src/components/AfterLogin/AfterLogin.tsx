import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth';
import { Button, Center } from '@chakra-ui/react';
import { activateSession, deactivateSession } from '@/context/Auth/authCookie';
import { getCompletedCourses } from './getCompletedCourses';
import { getCurrentCourses } from './getCurrentCourses';
import { countUnits} from './countUnits';

export function AfterLogin() {
  const auth = useAuth()

  const [units, setUnits] = useState<Record<string, string>>();

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
          const parts = value.match(/^(\d+)\((\d+)\)(.+)$/);
          if (parts) {
            return (
              <p key={key}>
                {key}: {parts[1]}
                <span style={{ color: '#999', fontSize: '0.8em' }}>
                  ({parts[2]})
                </span>
                {parts[3]}
              </p>
            );
          }
          return <p key={key}>{`${key}: ${value}`}</p>;
        })}
        <p style={{ color: '#666', fontSize: '0.9em'}}>※単位数が不明な科目については1単位で換算しています。</p>
      <Button variant='solid' mt={4} onClick={() => {
        auth.logout()
      }}>ログアウト</Button>
    </Center>
  )
}