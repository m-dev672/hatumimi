import { useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth';
import { Button, Center } from '@chakra-ui/react';
import { activateSession, deactivateSession } from '@/context/Auth/authCookie';
import { getCompletedCourses } from './getCompletedCourses';
import { getCurrentCourses } from './getCurrentCourses';
import { countUnits} from './countUnits';

export function AfterLogin() {
  const auth = useAuth()

  const [units, setUnits] = useState<Record<string, number>>();

  useEffect(() => {
    if (!auth.user.id) return;

    let sessionActivated = false;

    async function updateDailyInfo() {
      sessionActivated = await activateSession(auth.user);
      
      const courses = [...(await getCompletedCourses()), ...(await getCurrentCourses())]

      setUnits(countUnits(courses))
    }

    updateDailyInfo();

    return () => {
      if (sessionActivated) deactivateSession();
    };
  }, [auth.user])

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
        {units && Object.entries(units).map(([key, value]) => (
          <p key={key}>{`${key}: ${value}`}</p>
        ))}
      <Button variant='solid' mt={4} onClick={() => {
        auth.logout()
      }}>ログアウト</Button>
    </Center>
  )
}