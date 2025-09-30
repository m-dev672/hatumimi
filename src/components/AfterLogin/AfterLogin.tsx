import { useEffect } from 'react'
import { useAuth } from '@/hook/useAuth';
import { Button, Center } from '@chakra-ui/react';
import { getPerformance } from './getPerformance';
import { activateSession, deactivateSession } from '@/context/Auth/authCookie';

export function AfterLogin() {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.user.id) return;

    let sessionActivated = false;

    async function updateDailyInfo() {
      sessionActivated = await activateSession(auth.user);
      await getPerformance();
    }

    updateDailyInfo();

    return () => {
      if (sessionActivated) deactivateSession();
    };
  }, [auth.user])

  return (
    <Center h='100vh' flexDirection="column" alignItems="center" mx={4}>
      <Button variant='solid' mt={4} onClick={() => {
        auth.logout()
      }}>ログアウト</Button>
    </Center>
  )
}